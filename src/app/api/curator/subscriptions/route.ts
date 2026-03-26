import { NextResponse } from "next/server";
import { auth } from "@/auth";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "src/data");
const CHANNELS_PATH = path.join(DATA_DIR, "music-channels.json");
const FILTERED_PATH = path.join(DATA_DIR, "filtered-channels.json");
const REGISTRY_PATH = path.join(DATA_DIR, "channel-registry.json");

interface Channel {
  name: string;
  id: string;
}

interface RegistryEntry {
  id: string;
  name: string;
  importedAt: string;
  importSource: "subscription" | "paste" | "bookmarks";
  autoFiltered?: boolean;
  reviewedAt: string | null;
  lastScannedAt: string | null;
  uploadsFetched: number;
  scanError: string | null;
}

function readJson(filePath: string) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return [];
  }
}

function readRegistry(): Record<string, RegistryEntry> {
  try {
    return JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf-8"));
  } catch {
    return {};
  }
}

interface YTSubscriptionItem {
  snippet: {
    title: string;
    resourceId: { channelId: string };
  };
}

interface YTSubscriptionResponse {
  items?: YTSubscriptionItem[];
  nextPageToken?: string;
}

export async function GET() {
  const session = await auth();
  const accessToken = (session as unknown as { accessToken?: string })?.accessToken;

  if (!session || !accessToken) {
    return NextResponse.json(
      { error: "Not authenticated or missing YouTube access" },
      { status: 401 }
    );
  }

  // Fetch all YouTube subscriptions (paginated)
  const allSubs: { name: string; id: string }[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL("https://www.googleapis.com/youtube/v3/subscriptions");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("mine", "true");
    url.searchParams.set("maxResults", "50");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("YouTube subscriptions API error:", err);
      return NextResponse.json(
        { error: "Failed to fetch YouTube subscriptions" },
        { status: res.status }
      );
    }

    const data: YTSubscriptionResponse = await res.json();
    for (const item of data.items || []) {
      allSubs.push({
        name: item.snippet.title,
        id: item.snippet.resourceId.channelId,
      });
    }
    pageToken = data.nextPageToken;
  } while (pageToken);

  // Compare against existing channels
  const existingChannels: Channel[] = readJson(CHANNELS_PATH);
  const existingIds = new Set(existingChannels.map((c) => c.id));
  const newChannels = allSubs.filter((c) => !existingIds.has(c.id));

  return NextResponse.json({
    newChannels,
    totalSubscriptions: allSubs.length,
  });
}

export async function POST() {
  const session = await auth();
  const accessToken = (session as unknown as { accessToken?: string })?.accessToken;

  if (!session || !accessToken) {
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401 }
    );
  }

  // Re-fetch subscriptions and import new ones
  const allSubs: { name: string; id: string }[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL("https://www.googleapis.com/youtube/v3/subscriptions");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("mine", "true");
    url.searchParams.set("maxResults", "50");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) break;

    const data: YTSubscriptionResponse = await res.json();
    for (const item of data.items || []) {
      allSubs.push({
        name: item.snippet.title,
        id: item.snippet.resourceId.channelId,
      });
    }
    pageToken = data.nextPageToken;
  } while (pageToken);

  const existingChannels: Channel[] = readJson(CHANNELS_PATH);
  const existingIds = new Set(existingChannels.map((c) => c.id));
  const newChannels = allSubs.filter((c) => !existingIds.has(c.id));

  if (newChannels.length === 0) {
    return NextResponse.json({ added: 0, filtered: 0 });
  }

  // Batch-fetch topicDetails for new channels (up to 50 per request)
  const musicChannels: { name: string; id: string }[] = [];
  const filteredOut: { name: string; id: string; topics: string[] }[] = [];

  for (let i = 0; i < newChannels.length; i += 50) {
    const batch = newChannels.slice(i, i + 50);
    const ids = batch.map((c) => c.id).join(",");

    try {
      const topicUrl = new URL("https://www.googleapis.com/youtube/v3/channels");
      topicUrl.searchParams.set("part", "topicDetails");
      topicUrl.searchParams.set("id", ids);
      topicUrl.searchParams.set("key", process.env.YOUTUBE_API_KEY || "");

      const topicRes = await fetch(topicUrl.toString());
      if (topicRes.ok) {
        const topicData = await topicRes.json();
        const topicMap = new Map<string, string[]>();

        for (const item of topicData.items || []) {
          const categories: string[] = (item.topicDetails?.topicCategories || [])
            .map((url: string) => {
              const match = url.match(/wiki\/(.+)$/);
              return match ? match[1].replace(/_/g, " ") : url;
            });
          topicMap.set(item.id, categories);
        }

        for (const ch of batch) {
          const topics = topicMap.get(ch.id) || [];
          const isMusic = topics.some(
            (t) =>
              t.toLowerCase().includes("music") ||
              t.toLowerCase().includes("entertainment")
          );
          if (isMusic || topics.length === 0) {
            // Music candidate or no topic data — goes to review queue
            musicChannels.push(ch);
          } else {
            filteredOut.push({ ...ch, topics });
          }
        }
      } else {
        // API failed — treat all as music candidates (safe fallback)
        musicChannels.push(...batch);
      }
    } catch {
      // On error, treat all as music candidates
      musicChannels.push(...batch);
    }
  }

  const registry = readRegistry();
  const now = new Date().toISOString();

  // Add music channels to music-channels.json
  if (musicChannels.length > 0) {
    const updated = [...existingChannels, ...musicChannels];
    fs.writeFileSync(CHANNELS_PATH, JSON.stringify(updated, null, 2));
  }

  // Add filtered channels to filtered-channels.json
  if (filteredOut.length > 0) {
    let existing: { name: string; id: string; topics: string[] }[] = [];
    try {
      existing = JSON.parse(fs.readFileSync(FILTERED_PATH, "utf-8"));
    } catch {
      existing = [];
    }
    const existingFilteredIds = new Set(existing.map((c) => c.id));
    const newFiltered = filteredOut.filter((c) => !existingFilteredIds.has(c.id));
    fs.writeFileSync(FILTERED_PATH, JSON.stringify([...existing, ...newFiltered], null, 2));
  }

  // Update registry for all channels
  for (const ch of musicChannels) {
    if (!registry[ch.id]) {
      registry[ch.id] = {
        id: ch.id,
        name: ch.name,
        importedAt: now,
        importSource: "subscription",
        reviewedAt: null,
        lastScannedAt: null,
        uploadsFetched: 0,
        scanError: null,
      };
    }
  }
  for (const ch of filteredOut) {
    if (!registry[ch.id]) {
      registry[ch.id] = {
        id: ch.id,
        name: ch.name,
        importedAt: now,
        importSource: "subscription",
        autoFiltered: true,
        reviewedAt: null,
        lastScannedAt: null,
        uploadsFetched: 0,
        scanError: null,
      };
    }
  }
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2));

  return NextResponse.json({ added: musicChannels.length, filtered: filteredOut.length });
}

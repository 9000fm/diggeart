import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";

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

export async function POST() {
  const session = await auth();
  const accessToken = (session as unknown as { accessToken?: string })?.accessToken;

  if (!session || !accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
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
      return NextResponse.json({ error: "Failed to fetch subscriptions" }, { status: res.status });
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

  // Get all existing channel IDs from Supabase
  const { data: existing } = await supabase
    .from("curator_channels")
    .select("channel_id, status");

  const existingMap = new Map<string, string>();
  for (const ch of existing || []) {
    existingMap.set(ch.channel_id, ch.status);
  }

  // Find brand new channels (not in DB at all)
  const brandNew = allSubs.filter((c) => !existingMap.has(c.id));

  if (brandNew.length === 0) {
    return NextResponse.json({ added: 0, filtered: 0 });
  }

  // Batch-fetch topicDetails for new channels
  const musicChannels: { name: string; id: string }[] = [];
  const filteredOut: { name: string; id: string; topics: string }[] = [];

  for (let i = 0; i < brandNew.length; i += 50) {
    const batch = brandNew.slice(i, i + 50);
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
            musicChannels.push(ch);
          } else {
            filteredOut.push({ ...ch, topics: topics.join(", ") });
          }
        }
      } else {
        musicChannels.push(...batch);
      }
    } catch {
      musicChannels.push(...batch);
    }
  }

  const now = new Date().toISOString();

  // Insert music channels as pending
  if (musicChannels.length > 0) {
    const rows = musicChannels.map((ch) => ({
      channel_id: ch.id,
      name: ch.name,
      status: "pending",
      import_source: "subscription",
      imported_at: now,
    }));
    await supabase.from("curator_channels").insert(rows);
  }

  // Insert filtered channels
  if (filteredOut.length > 0) {
    const rows = filteredOut.map((ch) => ({
      channel_id: ch.id,
      name: ch.name,
      status: "filtered",
      notes: ch.topics,
      import_source: "subscription",
      imported_at: now,
    }));
    await supabase.from("curator_channels").insert(rows);
  }

  return NextResponse.json({
    added: musicChannels.length,
    filtered: filteredOut.length,
  });
}

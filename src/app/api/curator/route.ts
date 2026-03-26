import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getChannelUploads } from "@/lib/youtube";
import { auth } from "@/auth";

const DATA_DIR = path.join(process.cwd(), "src/data");
const CHANNELS_PATH = path.join(DATA_DIR, "music-channels.json");
const APPROVED_PATH = path.join(DATA_DIR, "approved-channels.json");
const REJECTED_PATH = path.join(DATA_DIR, "rejected-channels.json");
const UNSUB_PATH = path.join(DATA_DIR, "unsubscribe-channels.json");
const STARRED_PATH = path.join(DATA_DIR, "starred-channels.json");
const SKIPPED_PATH = path.join(DATA_DIR, "skipped-channels.json");
const FILTERED_PATH = path.join(DATA_DIR, "filtered-channels.json");
const REGISTRY_PATH = path.join(DATA_DIR, "channel-registry.json");

interface Channel {
  name: string;
  id: string;
}

interface ApprovedChannel extends Channel {
  labels?: string[];
}

interface RejectedChannel {
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

function writeJson(filePath: string, data: unknown) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function updateRegistry(
  channelId: string,
  updates: Partial<RegistryEntry>
) {
  const registry = readRegistry();
  if (registry[channelId]) {
    Object.assign(registry[channelId], updates);
    writeJson(REGISTRY_PATH, registry);
  }
}

function pickUploads(allUploads: Awaited<ReturnType<typeof getChannelUploads>>) {
  const sorted = [...allUploads].sort(
    (a, b) => (b.viewCount || 0) - (a.viewCount || 0)
  );
  const top3 = sorted.slice(0, 3).map((v) => ({
    ...v,
    isTopViewed: true as const,
  }));
  const rest = sorted.slice(3);
  const shuffled = [...rest].sort(() => Math.random() - 0.5);
  const random6 = shuffled.slice(0, 6).map((v) => ({
    ...v,
    isTopViewed: false as const,
  }));
  return [...top3, ...random6];
}

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("mode");
  const rescan = req.nextUrl.searchParams.get("rescan");
  const rescanChannelId = req.nextUrl.searchParams.get("channelId");

  const allChannels: Channel[] = readJson(CHANNELS_PATH);
  const approved: ApprovedChannel[] = readJson(APPROVED_PATH);
  const rejected: RejectedChannel[] = readJson(REJECTED_PATH);
  const unsub: Channel[] = readJson(UNSUB_PATH);
  const starred: Channel[] = readJson(STARRED_PATH);
  const skipped: string[] = readJson(SKIPPED_PATH);

  // Set-based dedup for accurate counts
  const approvedIds = new Set(approved.map((c) => c.id));
  const rejectedIds = new Set(rejected.map((c) => c.id));
  const unsubIds = new Set(unsub.map((c) => c.id));
  const decidedIds = new Set([
    ...approved.map((c) => c.id),
    ...rejected.map((c) => c.id),
    ...unsub.map((c) => c.id),
  ]);
  const skippedIds = new Set(skipped);
  const starredIds = new Set(starred.map((c) => c.id));

  // Return stats for the stats bar
  if (mode === "stats") {
    const noLabels = approved.filter(
      (c) => !c.labels || c.labels.length === 0
    ).length;
    // Detect conflicts: channels in both approved AND rejected
    const conflicts = approved.filter((c) => rejectedIds.has(c.id));

    return NextResponse.json({
      imported: allChannels.length,
      approved: approved.length,
      skipped: skipped.length,
      rejected: rejected.length,
      unsub: unsub.length,
      starred: starred.length,
      pending: allChannels.length - decidedIds.size,
      conflicts: conflicts.length,
      unreviewed: allChannels.length - decidedIds.size,
      noLabels,
    });
  }

  // Coverage: full status breakdown with channel lists per segment
  if (mode === "coverage") {
    const registry = readRegistry();

    const approvedList = approved.map((c) => ({
      ...c,
      isStarred: starredIds.has(c.id),
    }));

    const rejectedList = rejected.filter((c) => !unsubIds.has(c.id));
    const unsubList = unsub;

    const unreviewedList = allChannels.filter((c) => !decidedIds.has(c.id));
    const skippedList = allChannels.filter(
      (c) => skippedIds.has(c.id) && !decidedIds.has(c.id)
    );

    // Conflicts: in both approved AND rejected
    const conflictList = approved.filter((c) => rejectedIds.has(c.id));

    return NextResponse.json({
      total: allChannels.length,
      segments: {
        approved: { count: approved.length, channels: approvedList },
        rejected: {
          count: rejectedList.length,
          channels: rejectedList,
        },
        unsub: { count: unsub.length, channels: unsubList },
        skipped: { count: skippedList.length, channels: skippedList },
        unreviewed: {
          count: unreviewedList.length,
          channels: unreviewedList,
        },
        conflict: { count: conflictList.length, channels: conflictList },
      },
    });
  }

  // Health: conflicts, scan errors, never-scanned, no-labels
  if (mode === "health") {
    const registry = readRegistry();

    const conflicts = approved
      .filter((c) => rejectedIds.has(c.id))
      .map((c) => ({ ...c, issue: "In both approved & rejected" }));

    const noLabels = approved.filter(
      (c) => !c.labels || c.labels.length === 0
    );

    const scanErrors: (RegistryEntry & { issue: string })[] = [];
    const neverScanned: RegistryEntry[] = [];

    for (const entry of Object.values(registry)) {
      if (entry.scanError) {
        scanErrors.push({ ...entry, issue: entry.scanError });
      }
      if (!entry.lastScannedAt && approvedIds.has(entry.id)) {
        neverScanned.push(entry);
      }
    }

    return NextResponse.json({
      conflicts,
      noLabels: noLabels.length,
      noLabelsList: noLabels,
      scanErrors: scanErrors.length,
      scanErrorsList: scanErrors,
      neverScanned: neverScanned.length,
      neverScannedList: neverScanned,
    });
  }

  // Check for new subscriptions without importing
  if (mode === "check-subs") {
    let newCount = 0;
    let error: string | undefined;
    try {
      const session = await auth();
      const accessToken = (session as unknown as { accessToken?: string })?.accessToken;
      if (accessToken) {
        const existingIds = new Set(allChannels.map((c) => c.id));
        let subPageToken: string | undefined;

        do {
          const url = new URL("https://www.googleapis.com/youtube/v3/subscriptions");
          url.searchParams.set("part", "snippet");
          url.searchParams.set("mine", "true");
          url.searchParams.set("maxResults", "50");
          if (subPageToken) url.searchParams.set("pageToken", subPageToken);

          const res = await fetch(url.toString(), {
            headers: { Authorization: `Bearer ${accessToken}` },
          });

          if (!res.ok) {
            error = "Failed to fetch subscriptions";
            break;
          }

          const data = await res.json();
          for (const item of data.items || []) {
            const chId = item.snippet?.resourceId?.channelId;
            if (chId && !existingIds.has(chId)) {
              newCount++;
            }
          }
          subPageToken = data.nextPageToken;
        } while (subPageToken);
      } else {
        error = "Not authenticated";
      }
    } catch (e) {
      error = e instanceof Error ? e.message : "Unknown error";
    }
    return NextResponse.json({ newCount, error });
  }

  // Return auto-filtered channels
  if (mode === "filtered") {
    const registry = readRegistry();
    const filtered: { name: string; id: string; topics: string[] }[] = readJson(FILTERED_PATH);
    const enriched = filtered.map((c) => ({
      ...c,
      importedAt: registry[c.id]?.importedAt || null,
    }));
    enriched.sort((a, b) => {
      if (!a.importedAt && !b.importedAt) return 0;
      if (!a.importedAt) return 1;
      if (!b.importedAt) return -1;
      return new Date(b.importedAt).getTime() - new Date(a.importedAt).getTime();
    });
    return NextResponse.json({ channels: enriched });
  }

  // Return rejected channels enriched with dates, sorted newest-first
  if (mode === "rejected") {
    const registry = readRegistry();
    const enriched = rejected.map((c) => ({
      ...c,
      reviewedAt: registry[c.id]?.reviewedAt || null,
      importedAt: registry[c.id]?.importedAt || null,
    }));
    enriched.sort((a, b) => {
      if (!a.reviewedAt && !b.reviewedAt) return 0;
      if (!a.reviewedAt) return 1;
      if (!b.reviewedAt) return -1;
      return new Date(b.reviewedAt).getTime() - new Date(a.reviewedAt).getTime();
    });
    return NextResponse.json({ channels: enriched });
  }

  // Return full approved list for the Approved Browser
  if (mode === "approved") {
    return NextResponse.json({
      channels: approved.map((c) => ({
        ...c,
        isStarred: starredIds.has(c.id),
      })),
    });
  }

  // Return skipped channels with names for Manage tab
  if (mode === "skipped") {
    const skippedChannels = allChannels.filter((c) => skipped.includes(c.id));
    return NextResponse.json({ channels: skippedChannels });
  }

  // Return untagged approved channels for Manage tab
  if (mode === "untagged") {
    const untagged = approved.filter(
      (c) => !c.labels || c.labels.length === 0
    );
    return NextResponse.json({ channels: untagged });
  }

  const unreviewed = allChannels.filter(
    (c) =>
      !approvedIds.has(c.id) &&
      !rejectedIds.has(c.id) &&
      !unsubIds.has(c.id)
  );

  // Filter out skipped channels to find the next one to show
  const available = unreviewed.filter((c) => !skippedIds.has(c.id));

  const reviewed = decidedIds.size;
  const total = allChannels.length;

  // Rescan: re-fetch a specific channel's uploads bypassing cache
  if (rescan === "true" && rescanChannelId) {
    const channel = allChannels.find((c) => c.id === rescanChannelId);
    if (!channel) {
      return NextResponse.json(
        { error: "Channel not found" },
        { status: 404 }
      );
    }

    let allUploads: Awaited<ReturnType<typeof getChannelUploads>> = [];
    let scanError: string | null = null;
    try {
      allUploads = await getChannelUploads(channel.id, 50, true, true);
    } catch (e) {
      console.error("Failed to rescan uploads for", channel.name, e);
      scanError = e instanceof Error ? e.message : "Unknown error";
    }

    // Update registry with scan result
    updateRegistry(channel.id, {
      lastScannedAt: new Date().toISOString(),
      uploadsFetched: allUploads.length,
      scanError,
    });

    const uploads = pickUploads(allUploads);

    return NextResponse.json({
      channel,
      uploads,
      reviewed,
      total,
      remaining: unreviewed.length,
      approvedCount: approved.length,
      unsubCount: unsub.length,
      starredCount: starred.length,
      isStarred: starredIds.has(channel.id),
    });
  }

  if (available.length === 0) {
    // Check for unimported YouTube subscriptions
    let hasNewSubscriptions = false;
    let newSubCount = 0;
    try {
      const session = await auth();
      const accessToken = (session as unknown as { accessToken?: string })?.accessToken;
      if (accessToken) {
        const existingIds = new Set(allChannels.map((c) => c.id));
        let pageToken: string | undefined;
        const newSubs: string[] = [];

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

          const data = await res.json();
          for (const item of data.items || []) {
            const chId = item.snippet?.resourceId?.channelId;
            if (chId && !existingIds.has(chId)) {
              newSubs.push(chId);
            }
          }
          pageToken = data.nextPageToken;
        } while (pageToken);

        if (newSubs.length > 0) {
          hasNewSubscriptions = true;
          newSubCount = newSubs.length;
        }
      }
    } catch (e) {
      console.error("Failed to check subscriptions:", e);
    }

    return NextResponse.json({
      done: true,
      reviewed,
      total,
      approvedCount: approved.length,
      unsubCount: unsub.length,
      starredCount: starred.length,
      skippedCount: skipped.length,
      starredChannels: starred,
      approvedChannels: approved,
      rejectedCount: rejected.length,
      unsubChannels: unsub,
      hasNewSubscriptions,
      newSubCount,
    });
  }

  const channel = available[0];

  let allUploads: Awaited<ReturnType<typeof getChannelUploads>> = [];
  let scanError: string | null = null;
  try {
    allUploads = await getChannelUploads(channel.id, 50, true);
  } catch (e) {
    console.error("Failed to fetch uploads for", channel.name, e);
    scanError = e instanceof Error ? e.message : "Unknown error";
  }

  // Update registry with scan result
  updateRegistry(channel.id, {
    lastScannedAt: new Date().toISOString(),
    uploadsFetched: allUploads.length,
    scanError,
  });

  const uploads = pickUploads(allUploads);

  return NextResponse.json({
    channel,
    uploads,
    reviewed,
    total,
    remaining: unreviewed.length,
    approvedCount: approved.length,
    unsubCount: unsub.length,
    starredCount: starred.length,
    isStarred: starredIds.has(channel.id),
  });
}

export async function POST(req: NextRequest) {
  const { channelId, channelName, decision, labels } = await req.json();
  const now = new Date().toISOString();

  if (decision === "approve") {
    const approved: ApprovedChannel[] = readJson(APPROVED_PATH);
    if (!approved.some((c) => c.id === channelId)) {
      const entry: ApprovedChannel = { name: channelName, id: channelId };
      if (labels && labels.length > 0) {
        entry.labels = labels;
      }
      approved.push(entry);
      writeJson(APPROVED_PATH, approved);
    }
  } else if (decision === "reject") {
    const rejected: RejectedChannel[] = readJson(REJECTED_PATH);
    if (!rejected.some((c) => c.id === channelId)) {
      rejected.push({ name: channelName, id: channelId });
      writeJson(REJECTED_PATH, rejected);
    }
  } else if (decision === "unsubscribe") {
    const rejected: RejectedChannel[] = readJson(REJECTED_PATH);
    if (!rejected.some((c) => c.id === channelId)) {
      rejected.push({ name: channelName, id: channelId });
      writeJson(REJECTED_PATH, rejected);
    }
    const unsub: Channel[] = readJson(UNSUB_PATH);
    if (!unsub.some((c) => c.id === channelId)) {
      unsub.push({ name: channelName, id: channelId });
      writeJson(UNSUB_PATH, unsub);
    }
  }

  // Write reviewedAt to registry
  updateRegistry(channelId, { reviewedAt: now });

  // Also remove from skipped if it was skipped before
  const skipped: string[] = readJson(SKIPPED_PATH);
  const skipIdx = skipped.indexOf(channelId);
  if (skipIdx !== -1) {
    skipped.splice(skipIdx, 1);
    writeJson(SKIPPED_PATH, skipped);
  }

  return NextResponse.json({ ok: true });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();

  if (body.clear === true) {
    writeJson(SKIPPED_PATH, []);
    return NextResponse.json({ ok: true, cleared: true });
  }

  // Un-skip a single channel (move back to review queue)
  if (body.action === "unskip" && body.channelId) {
    const skipped: string[] = readJson(SKIPPED_PATH);
    const idx = skipped.indexOf(body.channelId);
    if (idx !== -1) {
      skipped.splice(idx, 1);
      writeJson(SKIPPED_PATH, skipped);
    }
    return NextResponse.json({ ok: true, skippedCount: skipped.length });
  }

  // Resolve conflict: remove from one list
  if (body.action === "resolveConflict" && body.channelId && body.keep) {
    if (body.keep === "approved") {
      const rejected: RejectedChannel[] = readJson(REJECTED_PATH);
      const filtered = rejected.filter((c) => c.id !== body.channelId);
      writeJson(REJECTED_PATH, filtered);
    } else if (body.keep === "rejected") {
      const approved: ApprovedChannel[] = readJson(APPROVED_PATH);
      const filtered = approved.filter((c) => c.id !== body.channelId);
      writeJson(APPROVED_PATH, filtered);
      // Also remove from starred
      const starred: Channel[] = readJson(STARRED_PATH);
      const filtered2 = starred.filter((c) => c.id !== body.channelId);
      writeJson(STARRED_PATH, filtered2);
    }
    return NextResponse.json({ ok: true });
  }

  // Change decision on an approved channel (reject or unsubscribe)
  if (
    body.action === "changeDecision" &&
    body.channelId &&
    body.newDecision
  ) {
    const approved: ApprovedChannel[] = readJson(APPROVED_PATH);
    const approvedIdx = approved.findIndex((c) => c.id === body.channelId);
    if (approvedIdx !== -1) {
      approved.splice(approvedIdx, 1);
      writeJson(APPROVED_PATH, approved);
    }

    const starred: Channel[] = readJson(STARRED_PATH);
    const starIdx = starred.findIndex((c) => c.id === body.channelId);
    if (starIdx !== -1) {
      starred.splice(starIdx, 1);
      writeJson(STARRED_PATH, starred);
    }

    const rejected: RejectedChannel[] = readJson(REJECTED_PATH);
    if (!rejected.some((c) => c.id === body.channelId)) {
      rejected.push({
        name: body.channelName || "",
        id: body.channelId,
      });
      writeJson(REJECTED_PATH, rejected);
    }

    if (body.newDecision === "unsubscribe") {
      const unsub: Channel[] = readJson(UNSUB_PATH);
      if (!unsub.some((c) => c.id === body.channelId)) {
        unsub.push({ name: body.channelName || "", id: body.channelId });
        writeJson(UNSUB_PATH, unsub);
      }
    }

    return NextResponse.json({ ok: true });
  }

  // Rescue a filtered channel → move to music-channels.json for review
  if (body.action === "rescueFiltered" && body.channelId) {
    const filtered: { name: string; id: string; topics: string[] }[] = readJson(FILTERED_PATH);
    const idx = filtered.findIndex((c) => c.id === body.channelId);
    let channelName = body.channelName || "";
    if (idx !== -1) {
      if (!channelName) channelName = filtered[idx].name;
      filtered.splice(idx, 1);
      writeJson(FILTERED_PATH, filtered);
    }

    const channels: Channel[] = readJson(CHANNELS_PATH);
    if (!channels.some((c) => c.id === body.channelId)) {
      channels.push({ name: channelName, id: body.channelId });
      writeJson(CHANNELS_PATH, channels);
    }

    // Update registry
    updateRegistry(body.channelId, { autoFiltered: false } as Partial<RegistryEntry>);

    return NextResponse.json({ ok: true });
  }

  // Rescue a channel from rejected → approved
  if (body.action === "rescueChannel" && body.channelId) {
    const rejected: RejectedChannel[] = readJson(REJECTED_PATH);
    const rejIdx = rejected.findIndex((c) => c.id === body.channelId);
    let channelName = body.channelName || "";
    if (rejIdx !== -1) {
      if (!channelName) channelName = rejected[rejIdx].name;
      rejected.splice(rejIdx, 1);
      writeJson(REJECTED_PATH, rejected);
    }

    const approved: ApprovedChannel[] = readJson(APPROVED_PATH);
    if (!approved.some((c) => c.id === body.channelId)) {
      const entry: ApprovedChannel = { name: channelName, id: body.channelId };
      if (body.labels && body.labels.length > 0) {
        entry.labels = body.labels;
      }
      approved.push(entry);
      writeJson(APPROVED_PATH, approved);
    }

    return NextResponse.json({ ok: true });
  }

  // Update labels on an approved channel
  if (body.action === "updateLabels" && body.channelId && body.labels) {
    const approved: ApprovedChannel[] = readJson(APPROVED_PATH);
    const ch = approved.find((c) => c.id === body.channelId);
    if (ch) {
      ch.labels = body.labels;
      writeJson(APPROVED_PATH, approved);
    }
    return NextResponse.json({ ok: true });
  }

  if (body.channelId) {
    // Add channel to skipped list
    const skipped: string[] = readJson(SKIPPED_PATH);
    if (!skipped.includes(body.channelId)) {
      skipped.push(body.channelId);
      writeJson(SKIPPED_PATH, skipped);
    }
    return NextResponse.json({ ok: true, skippedCount: skipped.length });
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}

export async function DELETE(req: NextRequest) {
  const { channelId } = await req.json();
  if (!channelId) {
    return NextResponse.json(
      { error: "channelId required" },
      { status: 400 }
    );
  }

  let channelData: ApprovedChannel | null = null;
  let removedFrom: string | null = null;

  // Try removing from approved
  const approved: ApprovedChannel[] = readJson(APPROVED_PATH);
  const approvedIdx = approved.findIndex((c) => c.id === channelId);
  if (approvedIdx !== -1) {
    channelData = approved[approvedIdx];
    removedFrom = "approve";
    approved.splice(approvedIdx, 1);
    writeJson(APPROVED_PATH, approved);
  }

  // Try removing from rejected
  const rejected: RejectedChannel[] = readJson(REJECTED_PATH);
  const rejectedIdx = rejected.findIndex((c) => c.id === channelId);
  if (rejectedIdx !== -1) {
    if (!removedFrom) removedFrom = "reject";
    rejected.splice(rejectedIdx, 1);
    writeJson(REJECTED_PATH, rejected);
  }

  // Try removing from unsub
  const unsub: Channel[] = readJson(UNSUB_PATH);
  const unsubIdx = unsub.findIndex((c) => c.id === channelId);
  if (unsubIdx !== -1) {
    if (!channelData) channelData = { ...unsub[unsubIdx] };
    if (!removedFrom) removedFrom = "unsubscribe";
    unsub.splice(unsubIdx, 1);
    writeJson(UNSUB_PATH, unsub);
  }

  // Also remove from skipped
  const skipped: string[] = readJson(SKIPPED_PATH);
  const skipIdx = skipped.indexOf(channelId);
  if (skipIdx !== -1) {
    skipped.splice(skipIdx, 1);
    writeJson(SKIPPED_PATH, skipped);
  }

  return NextResponse.json({ ok: true, removedFrom, channel: channelData });
}

export async function PATCH(req: NextRequest) {
  const { channelId, channelName } = await req.json();
  if (!channelId) {
    return NextResponse.json(
      { error: "channelId required" },
      { status: 400 }
    );
  }

  const starred: Channel[] = readJson(STARRED_PATH);
  const idx = starred.findIndex((c) => c.id === channelId);

  if (idx !== -1) {
    starred.splice(idx, 1);
    writeJson(STARRED_PATH, starred);
    return NextResponse.json({
      ok: true,
      starred: false,
      starredCount: starred.length,
    });
  } else {
    starred.push({ name: channelName || "", id: channelId });
    writeJson(STARRED_PATH, starred);
    return NextResponse.json({
      ok: true,
      starred: true,
      starredCount: starred.length,
    });
  }
}

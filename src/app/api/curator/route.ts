import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getChannelUploads } from "@/lib/youtube";

const DATA_DIR = path.join(process.cwd(), "src/data");
const CHANNELS_PATH = path.join(DATA_DIR, "music-channels.json");
const APPROVED_PATH = path.join(DATA_DIR, "approved-channels.json");
const REJECTED_PATH = path.join(DATA_DIR, "rejected-channels.json");
const UNSUB_PATH = path.join(DATA_DIR, "unsubscribe-channels.json");
const STARRED_PATH = path.join(DATA_DIR, "starred-channels.json");
const SKIPPED_PATH = path.join(DATA_DIR, "skipped-channels.json");

function readJson(filePath: string) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return [];
  }
}

function writeJson(filePath: string, data: unknown) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

export async function GET(req: NextRequest) {
  const rescan = req.nextUrl.searchParams.get("rescan");
  const rescanChannelId = req.nextUrl.searchParams.get("channelId");

  const allChannels: { name: string; id: string }[] = readJson(CHANNELS_PATH);
  const approved: { name: string; id: string; labels?: string[] }[] =
    readJson(APPROVED_PATH);
  const rejected: string[] = readJson(REJECTED_PATH);
  const unsub: { name: string; id: string }[] = readJson(UNSUB_PATH);
  const starred: { name: string; id: string }[] = readJson(STARRED_PATH);
  const skipped: string[] = readJson(SKIPPED_PATH);

  const approvedIds = new Set(approved.map((c) => c.id));
  const rejectedIds = new Set(rejected);
  const unsubIds = new Set(unsub.map((c) => c.id));
  const starredIds = new Set(starred.map((c) => c.id));
  const skippedIds = new Set(skipped);

  const unreviewed = allChannels.filter(
    (c) =>
      !approvedIds.has(c.id) && !rejectedIds.has(c.id) && !unsubIds.has(c.id)
  );

  // Filter out skipped channels to find the next one to show
  const available = unreviewed.filter((c) => !skippedIds.has(c.id));

  const reviewed = approved.length + rejected.length + unsub.length;
  const total = allChannels.length;

  // Rescan: re-fetch a specific channel's uploads bypassing cache
  if (rescan === "true" && rescanChannelId) {
    const channel = allChannels.find((c) => c.id === rescanChannelId);
    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    let allUploads: Awaited<ReturnType<typeof getChannelUploads>> = [];
    try {
      allUploads = await getChannelUploads(channel.id, 50, true, true);
    } catch (e) {
      console.error("Failed to rescan uploads for", channel.name, e);
    }

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
    const uploads = [...top3, ...random6];

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
    });
  }

  const channel = available[0];

  let allUploads: Awaited<ReturnType<typeof getChannelUploads>> = [];
  try {
    allUploads = await getChannelUploads(channel.id, 50, true);
  } catch (e) {
    console.error("Failed to fetch uploads for", channel.name, e);
  }

  // Pick top 3 most-viewed + 6 random from the rest
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
  const uploads = [...top3, ...random6];

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

  if (decision === "approve") {
    const approved: { name: string; id: string; labels?: string[] }[] =
      readJson(APPROVED_PATH);
    if (!approved.some((c) => c.id === channelId)) {
      const entry: { name: string; id: string; labels?: string[] } = {
        name: channelName,
        id: channelId,
      };
      if (labels && labels.length > 0) {
        entry.labels = labels;
      }
      approved.push(entry);
      writeJson(APPROVED_PATH, approved);
    }
  } else if (decision === "reject") {
    const rejected: string[] = readJson(REJECTED_PATH);
    if (!rejected.includes(channelId)) {
      rejected.push(channelId);
      writeJson(REJECTED_PATH, rejected);
    }
  } else if (decision === "unsubscribe") {
    const rejected: string[] = readJson(REJECTED_PATH);
    if (!rejected.includes(channelId)) {
      rejected.push(channelId);
      writeJson(REJECTED_PATH, rejected);
    }
    const unsub: { name: string; id: string }[] = readJson(UNSUB_PATH);
    if (!unsub.some((c) => c.id === channelId)) {
      unsub.push({ name: channelName, id: channelId });
      writeJson(UNSUB_PATH, unsub);
    }
  }

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
    // Clear all skipped channels
    writeJson(SKIPPED_PATH, []);
    return NextResponse.json({ ok: true, cleared: true });
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
    return NextResponse.json({ error: "channelId required" }, { status: 400 });
  }

  let channelData: { name: string; id: string; labels?: string[] } | null = null;
  let removedFrom: string | null = null;

  // Try removing from approved
  const approved: { name: string; id: string; labels?: string[] }[] = readJson(APPROVED_PATH);
  const approvedIdx = approved.findIndex((c) => c.id === channelId);
  if (approvedIdx !== -1) {
    channelData = approved[approvedIdx];
    removedFrom = "approve";
    approved.splice(approvedIdx, 1);
    writeJson(APPROVED_PATH, approved);
  }

  // Try removing from rejected
  const rejected: string[] = readJson(REJECTED_PATH);
  const rejectedIdx = rejected.indexOf(channelId);
  if (rejectedIdx !== -1) {
    if (!removedFrom) removedFrom = "reject";
    rejected.splice(rejectedIdx, 1);
    writeJson(REJECTED_PATH, rejected);
  }

  // Try removing from unsub
  const unsub: { name: string; id: string }[] = readJson(UNSUB_PATH);
  const unsubIdx = unsub.findIndex((c) => c.id === channelId);
  if (unsubIdx !== -1) {
    if (!channelData) channelData = unsub[unsubIdx];
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
    return NextResponse.json({ error: "channelId required" }, { status: 400 });
  }

  const starred: { name: string; id: string }[] = readJson(STARRED_PATH);
  const idx = starred.findIndex((c) => c.id === channelId);

  if (idx !== -1) {
    // Unstar
    starred.splice(idx, 1);
    writeJson(STARRED_PATH, starred);
    return NextResponse.json({ ok: true, starred: false, starredCount: starred.length });
  } else {
    // Star
    starred.push({ name: channelName || "", id: channelId });
    writeJson(STARRED_PATH, starred);
    return NextResponse.json({ ok: true, starred: true, starredCount: starred.length });
  }
}

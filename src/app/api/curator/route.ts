import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getChannelUploads } from "@/lib/youtube";

const DATA_DIR = path.join(process.cwd(), "src/data");
const CHANNELS_PATH = path.join(DATA_DIR, "music-channels.json");
const APPROVED_PATH = path.join(DATA_DIR, "approved-channels.json");
const REJECTED_PATH = path.join(DATA_DIR, "rejected-channels.json");
const UNSUB_PATH = path.join(DATA_DIR, "unsubscribe-channels.json");

function readJson(filePath: string) {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function writeJson(filePath: string, data: unknown) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

export async function GET() {
  const allChannels: { name: string; id: string }[] = readJson(CHANNELS_PATH);
  const approved: { name: string; id: string; labels?: string[] }[] =
    readJson(APPROVED_PATH);
  const rejected: string[] = readJson(REJECTED_PATH);
  const unsub: { name: string; id: string }[] = readJson(UNSUB_PATH);

  const approvedIds = new Set(approved.map((c) => c.id));
  const rejectedIds = new Set(rejected);
  const unsubIds = new Set(unsub.map((c) => c.id));

  const unreviewed = allChannels.filter(
    (c) =>
      !approvedIds.has(c.id) && !rejectedIds.has(c.id) && !unsubIds.has(c.id)
  );

  const reviewed = approved.length + rejected.length + unsub.length;
  const total = allChannels.length;

  if (unreviewed.length === 0) {
    return NextResponse.json({
      done: true,
      reviewed,
      total,
      approvedCount: approved.length,
      unsubCount: unsub.length,
    });
  }

  const channel = unreviewed[0];

  let uploads: Awaited<ReturnType<typeof getChannelUploads>> = [];
  try {
    uploads = await getChannelUploads(channel.id, 8);
  } catch (e) {
    console.error("Failed to fetch uploads for", channel.name, e);
  }

  return NextResponse.json({
    channel,
    uploads,
    reviewed,
    total,
    remaining: unreviewed.length,
    approvedCount: approved.length,
    unsubCount: unsub.length,
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

  return NextResponse.json({ ok: true });
}

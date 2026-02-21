import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const API_KEY = process.env.YOUTUBE_API_KEY!;
const DATA_DIR = path.join(process.cwd(), "src/data");
const CHANNELS_PATH = path.join(DATA_DIR, "music-channels.json");

function readJson(filePath: string) {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function writeJson(filePath: string, data: unknown) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

/**
 * Resolve a YouTube handle (@name) or custom URL (/c/name) to a channel ID + name.
 */
async function resolveHandle(
  handle: string
): Promise<{ id: string; name: string } | null> {
  // Try forHandle first (for @handles)
  const cleanHandle = handle.startsWith("@") ? handle : `@${handle}`;
  const params = new URLSearchParams({
    part: "snippet",
    forHandle: cleanHandle.slice(1), // API wants handle without @
    key: API_KEY,
  });

  let res = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?${params}`
  );

  if (res.ok) {
    const data = await res.json();
    if (data.items?.length > 0) {
      return {
        id: data.items[0].id,
        name: data.items[0].snippet.title,
      };
    }
  }

  // Fallback: search for the channel name
  const searchParams = new URLSearchParams({
    part: "snippet",
    q: handle.replace("@", ""),
    type: "channel",
    maxResults: "1",
    key: API_KEY,
  });

  res = await fetch(
    `https://www.googleapis.com/youtube/v3/search?${searchParams}`
  );

  if (res.ok) {
    const data = await res.json();
    if (data.items?.length > 0) {
      return {
        id: data.items[0].snippet.channelId,
        name: data.items[0].snippet.title,
      };
    }
  }

  return null;
}

/**
 * Resolve a channel ID to its name.
 */
async function getChannelName(
  channelId: string
): Promise<string | null> {
  const params = new URLSearchParams({
    part: "snippet",
    id: channelId,
    key: API_KEY,
  });

  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?${params}`
  );

  if (res.ok) {
    const data = await res.json();
    if (data.items?.length > 0) {
      return data.items[0].snippet.title;
    }
  }
  return null;
}

/**
 * Parse a YouTube URL into a channel identifier.
 * Supports:
 * - youtube.com/channel/UCxxxxxx
 * - youtube.com/@handle
 * - youtube.com/c/customname
 * - youtube.com/user/username
 * - Just a raw channel ID (UC...)
 * - Just a raw @handle
 */
function parseUrl(
  input: string
): { type: "id"; value: string } | { type: "handle"; value: string } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Raw channel ID
  if (/^UC[\w-]{22}$/.test(trimmed)) {
    return { type: "id", value: trimmed };
  }

  // Raw handle
  if (trimmed.startsWith("@")) {
    return { type: "handle", value: trimmed };
  }

  try {
    const url = new URL(trimmed);
    const parts = url.pathname.split("/").filter(Boolean);

    if (parts[0] === "channel" && parts[1]) {
      return { type: "id", value: parts[1] };
    }
    if (parts[0]?.startsWith("@")) {
      return { type: "handle", value: parts[0] };
    }
    if ((parts[0] === "c" || parts[0] === "user") && parts[1]) {
      return { type: "handle", value: parts[1] };
    }
  } catch {
    // Not a URL — treat as handle/name
    return { type: "handle", value: trimmed };
  }

  return null;
}

export async function POST(req: NextRequest) {
  const { urls } = await req.json();

  if (!urls || typeof urls !== "string") {
    return NextResponse.json({ error: "Provide urls as a string" }, { status: 400 });
  }

  const lines = urls
    .split("\n")
    .map((l: string) => l.trim())
    .filter(Boolean);

  const channels: { name: string; id: string }[] = readJson(CHANNELS_PATH);
  const existingIds = new Set(channels.map((c) => c.id));

  const added: string[] = [];
  const failed: string[] = [];

  for (const line of lines) {
    const parsed = parseUrl(line);
    if (!parsed) {
      failed.push(line);
      continue;
    }

    try {
      if (parsed.type === "id") {
        if (existingIds.has(parsed.value)) continue;
        const name = await getChannelName(parsed.value);
        if (name) {
          channels.push({ name, id: parsed.value });
          existingIds.add(parsed.value);
          added.push(name);
        } else {
          failed.push(line);
        }
      } else {
        const resolved = await resolveHandle(parsed.value);
        if (resolved && !existingIds.has(resolved.id)) {
          channels.push({ name: resolved.name, id: resolved.id });
          existingIds.add(resolved.id);
          added.push(resolved.name);
        } else if (!resolved) {
          failed.push(line);
        }
      }
    } catch {
      failed.push(line);
    }
  }

  if (added.length > 0) {
    writeJson(CHANNELS_PATH, channels);
  }

  return NextResponse.json({
    added,
    failed,
    totalChannels: channels.length,
  });
}

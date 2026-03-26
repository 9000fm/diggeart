import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const API_KEY = process.env.YOUTUBE_API_KEY!;

async function resolveHandle(handle: string): Promise<{ id: string; name: string } | null> {
  const cleanHandle = handle.startsWith("@") ? handle : `@${handle}`;
  const params = new URLSearchParams({ part: "snippet", forHandle: cleanHandle.slice(1), key: API_KEY });
  let res = await fetch(`https://www.googleapis.com/youtube/v3/channels?${params}`);
  if (res.ok) {
    const data = await res.json();
    if (data.items?.length > 0) return { id: data.items[0].id, name: data.items[0].snippet.title };
  }
  const searchParams = new URLSearchParams({ part: "snippet", q: handle.replace("@", ""), type: "channel", maxResults: "1", key: API_KEY });
  res = await fetch(`https://www.googleapis.com/youtube/v3/search?${searchParams}`);
  if (res.ok) {
    const data = await res.json();
    if (data.items?.length > 0) return { id: data.items[0].snippet.channelId, name: data.items[0].snippet.title };
  }
  return null;
}

async function getChannelName(channelId: string): Promise<string | null> {
  const params = new URLSearchParams({ part: "snippet", id: channelId, key: API_KEY });
  const res = await fetch(`https://www.googleapis.com/youtube/v3/channels?${params}`);
  if (res.ok) {
    const data = await res.json();
    if (data.items?.length > 0) return data.items[0].snippet.title;
  }
  return null;
}

function parseUrl(input: string): { type: "id"; value: string } | { type: "handle"; value: string } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (/^UC[\w-]{22}$/.test(trimmed)) return { type: "id", value: trimmed };
  if (trimmed.startsWith("@")) return { type: "handle", value: trimmed };
  try {
    const url = new URL(trimmed);
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "channel" && parts[1]) return { type: "id", value: parts[1] };
    if (parts[0]?.startsWith("@")) return { type: "handle", value: parts[0] };
    if ((parts[0] === "c" || parts[0] === "user") && parts[1]) return { type: "handle", value: parts[1] };
  } catch {
    return { type: "handle", value: trimmed };
  }
  return null;
}

export async function POST(req: NextRequest) {
  const { urls } = await req.json();
  if (!urls || typeof urls !== "string") {
    return NextResponse.json({ error: "Provide urls as a string" }, { status: 400 });
  }

  const lines = urls.split("\n").map((l: string) => l.trim()).filter(Boolean);

  // Get existing channel IDs from Supabase
  const { data: existing } = await supabase.from("curator_channels").select("channel_id");
  const existingIds = new Set((existing || []).map((c: { channel_id: string }) => c.channel_id));

  const added: string[] = [];
  const failed: string[] = [];
  const now = new Date().toISOString();

  for (const line of lines) {
    const parsed = parseUrl(line);
    if (!parsed) { failed.push(line); continue; }

    try {
      let channelId: string;
      let channelName: string;

      if (parsed.type === "id") {
        if (existingIds.has(parsed.value)) continue;
        const name = await getChannelName(parsed.value);
        if (!name) { failed.push(line); continue; }
        channelId = parsed.value;
        channelName = name;
      } else {
        const resolved = await resolveHandle(parsed.value);
        if (!resolved) { failed.push(line); continue; }
        if (existingIds.has(resolved.id)) continue;
        channelId = resolved.id;
        channelName = resolved.name;
      }

      await supabase.from("curator_channels").insert({
        channel_id: channelId,
        name: channelName,
        status: "pending",
        import_source: "paste",
        imported_at: now,
      });

      existingIds.add(channelId);
      added.push(channelName);
    } catch {
      failed.push(line);
    }
  }

  return NextResponse.json({ added, failed });
}

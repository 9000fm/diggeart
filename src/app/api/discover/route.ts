import { NextRequest, NextResponse } from "next/server";
import { discoverFromYouTube, isValidTag } from "@/lib/youtube";
import type { Tag } from "@/lib/youtube";

export async function GET(req: NextRequest) {
  const limit = Math.min(
    Number(req.nextUrl.searchParams.get("limit") || 30),
    50
  );
  const offset = Number(req.nextUrl.searchParams.get("offset") || 0);
  const rawTag = req.nextUrl.searchParams.get("tag");
  const tag: Tag = isValidTag(rawTag) ? rawTag : "all";
  const genre = req.nextUrl.searchParams.get("genre") || undefined;

  try {
    const { cards, totalFiltered } = await discoverFromYouTube(limit, offset, tag, genre);
    return NextResponse.json({
      cards,
      hasMore: offset + cards.length < totalFiltered,
    });
  } catch (err) {
    console.error("Discover API error:", err);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

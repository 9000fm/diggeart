import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { discoverFromYouTube, rebuildDiscoverPool, isValidTag } from "@/lib/youtube";
import type { Tag } from "@/lib/youtube";

export async function GET(req: NextRequest) {
  const limit = Math.min(
    Number(req.nextUrl.searchParams.get("limit") || 30),
    50
  );
  const offset = Number(req.nextUrl.searchParams.get("offset") || 0);
  const rawTag = req.nextUrl.searchParams.get("tag") || "";
  const tags: Tag[] = rawTag.split(",").map((t) => t.trim()).filter(isValidTag);
  const tag: Tag | Tag[] = tags.length <= 1 ? (tags[0] || "all") : tags;
  const genre = req.nextUrl.searchParams.get("genre") || undefined;
  const rotate = parseInt(req.nextUrl.searchParams.get("rotate") || "0", 10) || undefined;

  try {
    const { cards, totalFiltered, needsRebuild } = await discoverFromYouTube(limit, offset, tag, genre, rotate);

    if (needsRebuild) {
      after(() => rebuildDiscoverPool());
    }

    return NextResponse.json({
      cards,
      hasMore: offset + cards.length < totalFiltered,
    });
  } catch (err) {
    console.error("Discover API error:", err);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { discoverMixes, rebuildMixesPool, isValidTag } from "@/lib/youtube";
import type { Tag } from "@/lib/youtube";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const rawTag = searchParams.get("tag") || "";
    const tags: Tag[] = rawTag.split(",").map((t) => t.trim()).filter(isValidTag);
    const tag: Tag | Tag[] = tags.length <= 1 ? (tags[0] || "all") : tags;
    const genre = searchParams.get("genre") || undefined;
    const rotate = parseInt(searchParams.get("rotate") || "0", 10) || undefined;

    const { cards, totalFiltered, needsRebuild } = await discoverMixes(limit, offset, tag, genre, rotate);

    if (needsRebuild) {
      after(() => rebuildMixesPool());
    }

    return NextResponse.json({
      cards,
      hasMore: offset + cards.length < totalFiltered,
    });
  } catch (error) {
    console.error("Mixes API error:", error);
    return NextResponse.json({ cards: [], hasMore: false }, { status: 500 });
  }
}

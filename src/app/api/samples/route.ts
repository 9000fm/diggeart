import { NextRequest, NextResponse } from "next/server";
import { discoverSamples, isValidTag } from "@/lib/youtube";
import type { Tag } from "@/lib/youtube";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const limit = parseInt(searchParams.get("limit") || "30", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const rawTag = searchParams.get("tag");
    const tag: Tag = isValidTag(rawTag) ? rawTag : "all";
    const genre = searchParams.get("genre") || undefined;

    const { cards, totalFiltered } = await discoverSamples(limit, offset, tag, genre);
    return NextResponse.json({
      cards,
      hasMore: offset + cards.length < totalFiltered,
    });
  } catch (error) {
    console.error("Samples API error:", error);
    return NextResponse.json({ cards: [], hasMore: false }, { status: 500 });
  }
}

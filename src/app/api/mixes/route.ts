import { NextResponse } from "next/server";
import { discoverMixes } from "@/lib/youtube";

export async function GET() {
  try {
    const cards = await discoverMixes(20);
    return NextResponse.json({ cards });
  } catch (error) {
    console.error("Mixes API error:", error);
    return NextResponse.json({ cards: [] }, { status: 500 });
  }
}

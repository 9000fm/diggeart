import { NextResponse } from "next/server";
import { discoverSamples } from "@/lib/youtube";

export async function GET() {
  try {
    const cards = await discoverSamples(30);
    return NextResponse.json({ cards });
  } catch (error) {
    console.error("Samples API error:", error);
    return NextResponse.json({ cards: [] }, { status: 500 });
  }
}

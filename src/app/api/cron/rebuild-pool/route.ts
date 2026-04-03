import { NextRequest, NextResponse } from "next/server";
import { rebuildDiscoverPool, rebuildMixesPool, rebuildSamplesPool } from "@/lib/youtube";

export async function GET(req: NextRequest) {
  // Verify Vercel cron secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, string> = {};

  try {
    await rebuildDiscoverPool();
    results.discover = "ok";
  } catch (e) {
    results.discover = `error: ${e}`;
  }

  try {
    await rebuildMixesPool();
    results.mixes = "ok";
  } catch (e) {
    results.mixes = `error: ${e}`;
  }

  try {
    await rebuildSamplesPool();
    results.samples = "ok";
  } catch (e) {
    results.samples = `error: ${e}`;
  }

  return NextResponse.json({ rebuilt: results, at: new Date().toISOString() });
}

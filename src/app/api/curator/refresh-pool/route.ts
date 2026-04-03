import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";
import { cacheDeleteByPrefix } from "@/lib/cache";
import { rebuildDiscoverPool, rebuildMixesPool, rebuildSamplesPool } from "@/lib/youtube";
import { after } from "next/server";

export async function POST() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Mark all pools as stale by backdating updated_at (keeps old data serving)
  const staleDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase
    .from("pool_cache")
    .update({ updated_at: staleDate })
    .in("key", ["discover", "mixes", "samples", "raw-discover", "raw-mixes", "raw-samples"]);

  if (error) {
    return NextResponse.json({ error: "Failed to mark pools as stale" }, { status: 500 });
  }

  // Clear in-memory caches so next request reads from Supabase (stale → triggers rebuild)
  cacheDeleteByPrefix("pool-");

  // Trigger rebuilds in background — old data keeps serving until done
  after(async () => {
    await rebuildDiscoverPool();
    await rebuildMixesPool();
    await rebuildSamplesPool();
  });

  return NextResponse.json({ success: true, message: "Rebuilding pools in background. Old data still serving." });
}

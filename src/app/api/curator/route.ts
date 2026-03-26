import { NextRequest, NextResponse } from "next/server";
import { getChannelUploads } from "@/lib/youtube";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";

function pickUploads(allUploads: Awaited<ReturnType<typeof getChannelUploads>>) {
  const sorted = [...allUploads].sort(
    (a, b) => (b.viewCount || 0) - (a.viewCount || 0)
  );
  const top3 = sorted.slice(0, 3).map((v) => ({ ...v, isTopViewed: true as const }));
  const rest = sorted.slice(3);
  const shuffled = [...rest].sort(() => Math.random() - 0.5);
  const random6 = shuffled.slice(0, 6).map((v) => ({ ...v, isTopViewed: false as const }));
  return [...top3, ...random6];
}

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("mode");
  const rescan = req.nextUrl.searchParams.get("rescan");
  const rescanChannelId = req.nextUrl.searchParams.get("channelId");

  // Stats
  if (mode === "stats") {
    const { count: total } = await supabase.from("curator_channels").select("*", { count: "exact", head: true });
    const { count: approved } = await supabase.from("curator_channels").select("*", { count: "exact", head: true }).eq("status", "approved");
    const { count: rejected } = await supabase.from("curator_channels").select("*", { count: "exact", head: true }).eq("status", "rejected");
    const { count: pending } = await supabase.from("curator_channels").select("*", { count: "exact", head: true }).eq("status", "pending");
    const { count: filtered } = await supabase.from("curator_channels").select("*", { count: "exact", head: true }).eq("status", "filtered");
    const { count: starred } = await supabase.from("curator_channels").select("*", { count: "exact", head: true }).eq("starred", true);

    return NextResponse.json({
      imported: total || 0,
      approved: approved || 0,
      rejected: rejected || 0,
      starred: starred || 0,
      pending: (pending || 0) + (filtered || 0),
    });
  }

  // Check subs
  if (mode === "check-subs") {
    const session = await auth();
    const accessToken = (session as unknown as { accessToken?: string })?.accessToken;
    if (!session || !accessToken) {
      return NextResponse.json({ newCount: 0, error: "Not authenticated" });
    }

    try {
      const url = new URL("https://www.googleapis.com/youtube/v3/subscriptions");
      url.searchParams.set("part", "snippet");
      url.searchParams.set("mine", "true");
      url.searchParams.set("maxResults", "50");
      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return NextResponse.json({ newCount: 0, error: "API error" });

      const data = await res.json();
      const subIds = (data.items || []).map((i: { snippet: { resourceId: { channelId: string } } }) => i.snippet.resourceId.channelId);

      const { data: existing } = await supabase.from("curator_channels").select("channel_id");
      const existingIds = new Set((existing || []).map((c: { channel_id: string }) => c.channel_id));
      const newCount = subIds.filter((id: string) => !existingIds.has(id)).length;

      return NextResponse.json({ newCount });
    } catch {
      return NextResponse.json({ newCount: 0, error: "Check failed" });
    }
  }

  // Filtered channels
  if (mode === "filtered") {
    const { data: channels } = await supabase
      .from("curator_channels")
      .select("channel_id, name, notes, imported_at")
      .eq("status", "filtered")
      .order("imported_at", { ascending: false });

    return NextResponse.json({
      channels: (channels || []).map((c) => ({
        name: c.name,
        id: c.channel_id,
        topics: c.notes ? [c.notes] : [],
        importedAt: c.imported_at,
      })),
    });
  }

  // Rejected channels
  if (mode === "rejected") {
    const { data: channels } = await supabase
      .from("curator_channels")
      .select("channel_id, name, reviewed_at, imported_at")
      .eq("status", "rejected")
      .order("name");

    return NextResponse.json({
      channels: (channels || []).map((c) => ({
        name: c.name,
        id: c.channel_id,
        reviewedAt: c.reviewed_at,
        importedAt: c.imported_at,
      })),
    });
  }

  // Approved channels
  if (mode === "approved") {
    const { data: channels } = await supabase
      .from("curator_channels")
      .select("channel_id, name, labels, starred, reviewed_at, notes")
      .eq("status", "approved")
      .order("name");

    return NextResponse.json({
      channels: (channels || []).map((c) => ({
        name: c.name,
        id: c.channel_id,
        labels: c.labels || [],
        isStarred: c.starred,
        reviewedAt: c.reviewed_at,
        notes: c.notes,
      })),
    });
  }

  // Pending channels (for Review tab)
  if (mode === "pending") {
    const { data: channels } = await supabase
      .from("curator_channels")
      .select("channel_id, name, imported_at")
      .eq("status", "pending")
      .order("imported_at", { ascending: false });

    return NextResponse.json({
      channels: (channels || []).map((c) => ({
        name: c.name,
        id: c.channel_id,
        importedAt: c.imported_at,
      })),
    });
  }

  // Rescan: fetch uploads + topics for a specific channel
  if (rescan === "true" && rescanChannelId) {
    const { data: chData } = await supabase
      .from("curator_channels")
      .select("channel_id, name, starred")
      .eq("channel_id", rescanChannelId)
      .single();

    if (!chData) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    let allUploads: Awaited<ReturnType<typeof getChannelUploads>> = [];
    try {
      allUploads = await getChannelUploads(rescanChannelId, 50, true, true);
    } catch (e) {
      console.error("Failed to rescan uploads for", chData.name, e);
    }

    // Update scan info
    await supabase
      .from("curator_channels")
      .update({
        last_scanned_at: new Date().toISOString(),
        uploads_fetched: allUploads.length,
      })
      .eq("channel_id", rescanChannelId);

    const uploads = pickUploads(allUploads);

    // Fetch YouTube topic categories
    let topics: string[] = [];
    try {
      const topicUrl = new URL("https://www.googleapis.com/youtube/v3/channels");
      topicUrl.searchParams.set("part", "topicDetails");
      topicUrl.searchParams.set("id", rescanChannelId);
      topicUrl.searchParams.set("key", process.env.YOUTUBE_API_KEY || "");
      const topicRes = await fetch(topicUrl.toString());
      if (topicRes.ok) {
        const topicData = await topicRes.json();
        const item = topicData.items?.[0];
        if (item?.topicDetails?.topicCategories) {
          topics = item.topicDetails.topicCategories.map((url: string) => {
            const match = url.match(/wiki\/(.+)$/);
            return match ? match[1].replace(/_/g, " ") : url;
          });
        }
      }
    } catch { /* ignore */ }

    const { count: pendingCount } = await supabase
      .from("curator_channels")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    return NextResponse.json({
      channel: { name: chData.name, id: chData.channel_id },
      uploads,
      topics,
      reviewed: 0,
      total: pendingCount || 0,
      isStarred: chData.starred,
    });
  }

  // Default: next unreviewed channel
  const { data: nextChannel } = await supabase
    .from("curator_channels")
    .select("channel_id, name, starred")
    .eq("status", "pending")
    .order("imported_at")
    .limit(1)
    .single();

  if (!nextChannel) {
    const { count: total } = await supabase.from("curator_channels").select("*", { count: "exact", head: true });
    const { count: approved } = await supabase.from("curator_channels").select("*", { count: "exact", head: true }).eq("status", "approved");
    return NextResponse.json({ done: true, reviewed: total || 0, total: total || 0, approvedCount: approved || 0 });
  }

  let allUploads: Awaited<ReturnType<typeof getChannelUploads>> = [];
  try {
    allUploads = await getChannelUploads(nextChannel.channel_id, 50, true, true);
  } catch { /* ignore */ }

  await supabase
    .from("curator_channels")
    .update({ last_scanned_at: new Date().toISOString(), uploads_fetched: allUploads.length })
    .eq("channel_id", nextChannel.channel_id);

  const { count: total } = await supabase.from("curator_channels").select("*", { count: "exact", head: true });
  const { count: approved } = await supabase.from("curator_channels").select("*", { count: "exact", head: true }).eq("status", "approved");
  const { count: pending } = await supabase.from("curator_channels").select("*", { count: "exact", head: true }).eq("status", "pending");

  return NextResponse.json({
    channel: { name: nextChannel.name, id: nextChannel.channel_id },
    uploads: pickUploads(allUploads),
    reviewed: (total || 0) - (pending || 0),
    total: total || 0,
    remaining: pending || 0,
    approvedCount: approved || 0,
    isStarred: nextChannel.starred,
  });
}

// POST: Record a decision (approve/reject)
export async function POST(req: NextRequest) {
  const { channelId, channelName, decision, labels, notes } = await req.json();
  const now = new Date().toISOString();

  if (decision === "approve") {
    await supabase
      .from("curator_channels")
      .update({
        status: "approved",
        labels: labels || [],
        notes: notes || null,
        reviewed_at: now,
      })
      .eq("channel_id", channelId);
  } else if (decision === "reject") {
    await supabase
      .from("curator_channels")
      .update({
        status: "rejected",
        reviewed_at: now,
        notes: notes || null,
      })
      .eq("channel_id", channelId);
  }

  return NextResponse.json({ ok: true });
}

// PUT: Various actions
export async function PUT(req: NextRequest) {
  const body = await req.json();

  // Send to pending (filtered) from review
  if (body.action === "sendToPending" && body.channelId) {
    await supabase
      .from("curator_channels")
      .update({ status: "filtered", notes: "Rejected from Review" })
      .eq("channel_id", body.channelId);
    return NextResponse.json({ ok: true });
  }

  // Rescue from rejected → pending (music-channels / review)
  if (body.action === "rescueChannel" && body.channelId) {
    await supabase
      .from("curator_channels")
      .update({ status: "pending", reviewed_at: null })
      .eq("channel_id", body.channelId);
    return NextResponse.json({ ok: true });
  }

  // Rescue from filtered → pending (review)
  if (body.action === "rescueFiltered" && body.channelId) {
    await supabase
      .from("curator_channels")
      .update({ status: "pending", reviewed_at: null, notes: null })
      .eq("channel_id", body.channelId);
    return NextResponse.json({ ok: true });
  }

  // Rescue from rejected → filtered (pending review)
  if (body.action === "rescueToFiltered" && body.channelId) {
    await supabase
      .from("curator_channels")
      .update({ status: "filtered", notes: "Rescued from Rejected" })
      .eq("channel_id", body.channelId);
    return NextResponse.json({ ok: true });
  }

  // Confirm reject from filtered → rejected
  if (body.action === "confirmRejectFiltered" && body.channelId) {
    await supabase
      .from("curator_channels")
      .update({ status: "rejected", reviewed_at: new Date().toISOString() })
      .eq("channel_id", body.channelId);
    return NextResponse.json({ ok: true });
  }

  // Change decision (from approved → rejected)
  if (body.action === "changeDecision" && body.channelId) {
    await supabase
      .from("curator_channels")
      .update({ status: body.newDecision || "rejected", reviewed_at: new Date().toISOString(), labels: [] })
      .eq("channel_id", body.channelId);
    return NextResponse.json({ ok: true });
  }

  // Update labels
  if (body.action === "updateLabels" && body.channelId) {
    await supabase
      .from("curator_channels")
      .update({ labels: body.labels })
      .eq("channel_id", body.channelId);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

// PATCH: Toggle star
export async function PATCH(req: NextRequest) {
  const { channelId } = await req.json();

  const { data: ch } = await supabase
    .from("curator_channels")
    .select("starred")
    .eq("channel_id", channelId)
    .single();

  if (!ch) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const newStarred = !ch.starred;
  await supabase
    .from("curator_channels")
    .update({ starred: newStarred })
    .eq("channel_id", channelId);

  return NextResponse.json({ starred: newStarred });
}

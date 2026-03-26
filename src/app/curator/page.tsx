"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import type { CuratorTab, ApprovedChannel, ApprovedView } from "./types";
import { useCuratorData } from "./hooks/useCuratorData";
import { useCuratorActions } from "./hooks/useCuratorActions";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { CuratorStatsBar } from "./components/CuratorStatsBar";
import { CuratorTabBar } from "./components/CuratorTabBar";
import { ReviewList } from "./components/ReviewList";
import { ApprovedBrowser } from "./components/ApprovedBrowser";
import { AuditMode } from "./components/AuditMode";
import { RejectedBrowser } from "./components/RejectedBrowser";
import { RejectedReview } from "./components/RejectedReview";
import { ReviewQueue } from "./components/ReviewQueue";
import AuthButton from "@/components/AuthButton";

interface ReviewChannel {
  name: string;
  id: string;
  origin?: string;
  importedAt?: string | null;
}

function CuratorAuthGate() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] font-mono flex items-center justify-center">
        <span className="animate-pulse text-[var(--text-muted)]">LOADING...</span>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] font-mono flex flex-col items-center justify-center gap-6">
        <h1 className="text-3xl font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]">CURATOR</h1>
        <p className="text-[var(--text-muted)] text-sm">Sign in to access the curator dashboard</p>
        <AuthButton />
        <a href="/" className="text-[var(--text-muted)] hover:text-[var(--text)] text-xs uppercase tracking-wider transition-colors mt-4">
          &larr; Back to digeart
        </a>
      </div>
    );
  }

  return <CuratorDashboard />;
}

export default function CuratorPage() {
  return <CuratorAuthGate />;
}

function CuratorDashboard() {
  const [activeTab, setActiveTab] = useState<CuratorTab>("review");
  const [selectedLabels, setSelectedLabels] = useState<Set<string>>(new Set());
  const [channelNotes, setChannelNotes] = useState("");
  const [isStarred, setIsStarred] = useState(false);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [approvedView, setApprovedView] = useState<ApprovedView>({ mode: "landing" });
  const [reviewingChannel, setReviewingChannel] = useState<ReviewChannel | null>(null);
  // Rejected review state
  const [rejectedReviewChannel, setRejectedReviewChannel] = useState<{ name: string; id: string } | null>(null);
  const [rejectedReviewData, setRejectedReviewData] = useState<{ uploads: import("./types").Upload[]; topics: string[] }>({ uploads: [], topics: [] });
  const [rejectedReviewActing, setRejectedReviewActing] = useState(false);

  // Track the full review list so we can auto-advance
  const reviewListRef = useRef<ReviewChannel[]>([]);

  const {
    data, setData, loading, stats,
    approvedChannels, setApprovedChannels, approvedLoading,
    rejectedChannels, rejectedLoading,
    filteredChannels, filteredLoading,
    pendingChannels, pendingLoading,
    newSubCount, setNewSubCount, subCheckError,
    fetchNext, fetchStats, fetchApproved, fetchRejected, fetchFiltered, fetchPending, checkSubs,
  } = useCuratorData();

  // Build unified review list: pending (unreviewed from music-channels) + filtered (auto-filtered)
  const reviewChannels: ReviewChannel[] = [
    ...pendingChannels.map((c) => ({ ...c, origin: undefined })),
    ...filteredChannels.map((c) => ({ name: c.name, id: c.id, origin: "auto-filtered", importedAt: c.importedAt })),
  ];
  reviewListRef.current = reviewChannels;

  const {
    acting, history, rescanning,
    handleDecision: rawHandleDecision,
    handleGoBack, handleToggleStar, handleRescan,
  } = useCuratorActions({
    data, setData, fetchNext, fetchStats, selectedLabels, notes: channelNotes,
    isStarred, setIsStarred, setSelectedLabels, setPlayingVideoId,
  });

  // Wrap handleDecision: after approve/reject, auto-advance to next channel
  const handleDecision = useCallback(
    async (decision: "approve" | "reject") => {
      if (!reviewingChannel) return;
      const currentId = reviewingChannel.id;

      await rawHandleDecision(decision);

      // Refresh lists
      await Promise.all([fetchPending(), fetchFiltered(), fetchStats()]);

      // Find next channel in the list (after current one)
      const list = reviewListRef.current;
      const currentIdx = list.findIndex((c) => c.id === currentId);
      const remaining = list.filter((c) => c.id !== currentId);

      if (remaining.length === 0) {
        // No more channels — show "all caught up"
        setReviewingChannel(null);
        return;
      }

      // Pick next: the one after current, or first if at end
      const nextIdx = currentIdx >= 0 && currentIdx < remaining.length ? currentIdx : 0;
      const next = remaining[nextIdx] || remaining[0];

      // Load next channel — skip any that get auto-rejected (< 6 uploads)
      let loaded = false;
      let tryIdx = nextIdx;
      let pool = remaining;
      while (!loaded && pool.length > 0) {
        const candidate = pool[tryIdx] || pool[0];
        loaded = await loadChannelForReview(candidate, pool.length);
        if (!loaded) {
          pool = pool.filter((c) => c.id !== candidate.id);
          tryIdx = 0;
        }
      }
      if (!loaded) {
        setReviewingChannel(null); // all remaining got auto-rejected
      }
    },
    [rawHandleDecision, fetchPending, fetchFiltered, fetchStats, reviewingChannel, setData, setSelectedLabels, setPlayingVideoId]
  );

  // Sync starred state
  useEffect(() => {
    if (data) setIsStarred(data.isStarred || false);
  }, [data]);

  // Fetch data when switching tabs
  useEffect(() => {
    if (activeTab === "approved") fetchApproved();
    if (activeTab === "review") { fetchPending(); fetchFiltered(); }
    if (activeTab === "rejected") fetchRejected();
  }, [activeTab, fetchApproved, fetchPending, fetchFiltered, fetchRejected]);

  // Reset views when switching tabs
  useEffect(() => {
    setApprovedView({ mode: "landing" });
    setReviewingChannel(null);
    setRejectedReviewChannel(null);
  }, [activeTab]);

  // Reset playing video when channel changes
  useEffect(() => {
    setPlayingVideoId(null);
  }, [data?.channel?.id]);

  const toggleLabel = useCallback((label: string) => {
    setSelectedLabels((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }, []);

  // --- Approved tab: audit mode ---
  const handleEnterAudit = useCallback((ch: ApprovedChannel) => {
    setApprovedView({ mode: "audit", channel: ch });
  }, []);

  const handleExitAudit = useCallback(() => {
    setApprovedView({ mode: "landing" });
    fetchApproved();
    fetchStats();
  }, [fetchApproved, fetchStats]);

  const handleChangeDecision = useCallback(
    async (channelId: string, channelName: string, newDecision: "reject") => {
      await fetch("/api/curator", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "changeDecision", channelId, channelName, newDecision }),
      });
      setApprovedChannels((prev) => prev.filter((c) => c.id !== channelId));
      setApprovedView({ mode: "landing" });
      fetchStats();
    },
    [fetchStats, setApprovedChannels]
  );

  // --- Review tab: enter/exit review ---
  // Load a channel for review, auto-skipping if it gets auto-rejected (< 6 uploads)
  const loadChannelForReview = useCallback(
    async (ch: ReviewChannel, listLength: number) => {
      setSelectedLabels(new Set());
      setPlayingVideoId(null);
      const res = await fetch(`/api/curator?rescan=true&channelId=${ch.id}`);
      const json = await res.json();

      if (json.autoRejected) {
        // Channel auto-rejected (too few uploads) — refresh lists and try next
        await Promise.all([fetchPending(), fetchFiltered(), fetchStats()]);
        return false; // signal: didn't load, try next
      }

      setReviewingChannel(ch);
      setData({
        channel: { name: ch.name, id: ch.id },
        uploads: json.uploads || [],
        topics: json.topics || [],
        reviewed: 0,
        total: listLength,
      });
      return true; // loaded successfully
    },
    [setData, setSelectedLabels, setPlayingVideoId, fetchPending, fetchFiltered, fetchStats]
  );

  const handleReviewChannel = useCallback(
    async (ch: ReviewChannel) => {
      const loaded = await loadChannelForReview(ch, reviewChannels.length);
      if (!loaded) {
        // Auto-rejected, stay on list — it'll refresh and show updated list
        setReviewingChannel(null);
      }
    },
    [loadChannelForReview, reviewChannels.length]
  );

  const handleExitReview = useCallback(() => {
    setReviewingChannel(null);
    fetchPending();
    fetchFiltered();
  }, [fetchPending, fetchFiltered]);

  // --- Import ---
  const [importing, setImporting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | undefined>();

  const handleQuickImport = useCallback(
    async (url: string) => {
      setImporting(true);
      const res = await fetch("/api/curator/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: url }),
      });
      const result = await res.json();
      if (result.added?.length > 0) {
        fetchPending();
        fetchStats();
      }
      setImporting(false);
    },
    [fetchPending, fetchStats]
  );

  const [syncDone, setSyncDone] = useState(false);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    setSyncError(undefined);
    setSyncDone(false);
    try {
      const res = await fetch("/api/curator/subscriptions", { method: "POST" });
      const result = await res.json();
      if (result.error) {
        setSyncError(result.error);
      } else {
        setNewSubCount(0);
        fetchPending();
        fetchFiltered();
        fetchRejected();
        fetchStats();
        setSyncDone(true);
      }
    } catch {
      setSyncError("Sync failed — check your connection");
    }
    setSyncing(false);
  }, [fetchPending, fetchFiltered, fetchRejected, fetchStats, setNewSubCount]);

  // --- Rescue from Rejected ---
  const handleRescueRejected = useCallback(
    async (channelId: string, channelName: string) => {
      // Move from rejected back to music-channels (New/Review)
      await fetch("/api/curator", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rescueChannel", channelId, channelName }),
      });
      fetchRejected();
      fetchPending();
      fetchStats();
    },
    [fetchRejected, fetchPending, fetchStats]
  );

  // --- Rejected review handlers ---
  const handleReviewRejectedChannel = useCallback(
    async (ch: { name: string; id: string }) => {
      setRejectedReviewChannel(ch);
      const res = await fetch(`/api/curator?rescan=true&channelId=${ch.id}`);
      const json = await res.json();
      setRejectedReviewData({ uploads: json.uploads || [], topics: json.topics || [] });
    },
    []
  );

  const handleRescueFromReview = useCallback(async () => {
    if (!rejectedReviewChannel || rejectedReviewActing) return;
    setRejectedReviewActing(true);
    await fetch("/api/curator", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "rescueChannel", channelId: rejectedReviewChannel.id, channelName: rejectedReviewChannel.name }),
    });
    // Auto-advance to next rejected
    const currentId = rejectedReviewChannel.id;
    await fetchRejected();
    fetchPending();
    fetchStats();
    setRejectedReviewActing(false);
    // Find next
    const remaining = rejectedChannels.filter((c) => c.id !== currentId);
    if (remaining.length > 0) {
      handleReviewRejectedChannel(remaining[0]);
    } else {
      setRejectedReviewChannel(null);
    }
  }, [rejectedReviewChannel, rejectedReviewActing, rejectedChannels, fetchRejected, fetchPending, fetchStats, handleReviewRejectedChannel]);

  const handleNextRejected = useCallback(() => {
    if (!rejectedReviewChannel) return;
    const currentIdx = rejectedChannels.findIndex((c) => c.id === rejectedReviewChannel.id);
    const nextIdx = (currentIdx + 1) % rejectedChannels.length;
    if (rejectedChannels.length > 1 || nextIdx !== currentIdx) {
      handleReviewRejectedChannel(rejectedChannels[nextIdx]);
    }
  }, [rejectedReviewChannel, rejectedChannels, handleReviewRejectedChannel]);

  const handleExitRejectedReview = useCallback(() => {
    setRejectedReviewChannel(null);
    fetchRejected();
  }, [fetchRejected]);

  // --- Keyboard shortcuts ---
  const auditChannel = approvedView.mode === "audit" ? approvedView.channel : null;

  useKeyboardShortcuts({
    activeTab,
    setActiveTab,
    isReviewing: !!reviewingChannel,
    handleDecision,
    handleGoBack,
    handleToggleStar,
    handleRescan,
    exitReview: handleExitReview,
    auditChannel,
  });

  // --- Render ---

  // Rejected review mode (full-screen)
  if (rejectedReviewChannel) {
    return (
      <RejectedReview
        channel={rejectedReviewChannel}
        uploads={rejectedReviewData.uploads}
        topics={rejectedReviewData.topics}
        onRescue={handleRescueFromReview}
        onNext={handleNextRejected}
        onExit={handleExitRejectedReview}
        acting={rejectedReviewActing}
        remaining={rejectedChannels.filter((c) => c.id !== rejectedReviewChannel.id).length}
      />
    );
  }

  // Audit mode (Approved tab, full-screen)
  if (approvedView.mode === "audit") {
    return (
      <AuditMode
        channel={approvedView.channel}
        stats={stats}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onExit={handleExitAudit}
        onChangeDecision={handleChangeDecision}
        fetchStats={fetchStats}
      />
    );
  }

  // Review mode (Review tab, full-screen channel review)
  if (reviewingChannel && data?.channel) {
    return (
      <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] font-mono">
        <div className="max-w-7xl mx-auto px-4 py-3 lg:px-8 lg:py-3">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-5">
              <button
                onClick={handleExitReview}
                className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors text-3xl leading-none"
              >
                &larr;
              </button>
              <button onClick={handleExitReview} className="text-3xl font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors">
                CURATOR
              </button>
              <span className="text-lg text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1">
                <span className="inline-flex">
                  {String(reviewChannels.length - 1).split("").map((digit, i) => (
                    <span
                      key={`${i}-${digit}`}
                      className="relative overflow-hidden h-[1.4em] w-[0.65em] inline-flex justify-center"
                    >
                      <span className="text-[var(--text)] font-bold tabular-nums text-2xl inline-block animate-[digit-flip_0.35s_cubic-bezier(0.2,0.8,0.2,1)]">
                        {digit}
                      </span>
                    </span>
                  ))}
                </span>
                <span className="ml-1">left</span>
              </span>
              <style>{`
                @keyframes digit-flip {
                  0% { transform: translateY(-110%); opacity: 0; }
                  60% { transform: translateY(5%); opacity: 1; }
                  100% { transform: translateY(0); }
                }
              `}</style>
            </div>
          </div>
          <ReviewQueue
            data={data}
            acting={acting}
            history={history}
            rescanning={rescanning}
            isStarred={isStarred}
            selectedLabels={selectedLabels}
            onToggleLabel={toggleLabel}
            onDecision={handleDecision}
            onGoBack={handleGoBack}
            onToggleStar={(starred: boolean) => setIsStarred(starred)}
            onRescan={handleRescan}
            notes={channelNotes}
            onNotesChange={setChannelNotes}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] font-mono">
      <div className="max-w-7xl mx-auto px-4 py-3 lg:px-8 lg:py-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]">
            CURATOR
          </h1>
          <div className="flex items-center gap-4">
            <a href="/" className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] uppercase tracking-[0.15em] transition-colors border border-[var(--border)] hover:border-[var(--text-muted)] rounded-lg px-4 py-2 font-bold">
              &larr; BACK TO DIGEART
            </a>
            <AuthButton />
          </div>
        </div>

        <CuratorStatsBar stats={stats} />
        <CuratorTabBar
          activeTab={activeTab}
          onChange={setActiveTab}
          approvedCount={stats?.approved}
          reviewCount={reviewChannels.length}
          rejectedCount={stats?.rejected}
        />

        {activeTab === "approved" && (
          <ApprovedBrowser
            channels={approvedChannels}
            loading={approvedLoading}
            onEnterAudit={handleEnterAudit}
          />
        )}

        {activeTab === "review" && (
          <ReviewList
            channels={reviewChannels}
            loading={pendingLoading || filteredLoading}
            onReviewChannel={handleReviewChannel}
            onSync={handleSync}
            syncing={syncing}
            syncError={syncError}
            syncDone={syncDone}
            onQuickImport={handleQuickImport}
            importing={importing}
          />
        )}

        {activeTab === "rejected" && (
          <RejectedBrowser
            channels={rejectedChannels}
            loading={rejectedLoading}
            onRescue={handleRescueRejected}
            onReviewChannel={handleReviewRejectedChannel}
          />
        )}
      </div>
    </div>
  );
}

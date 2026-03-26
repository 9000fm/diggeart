"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  CuratorTab,
  ApprovedChannel,
  ApprovedView,
  QueueType,
} from "./types";
import { useCuratorData } from "./hooks/useCuratorData";
import { useCuratorActions } from "./hooks/useCuratorActions";
import { useImport } from "./hooks/useImport";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { CuratorStatsBar } from "./components/CuratorStatsBar";
import { CuratorTabBar } from "./components/CuratorTabBar";
import { ReviewQueue } from "./components/ReviewQueue";
import { ReviewEmptyState } from "./components/ReviewEmptyState";
import { ApprovedBrowser } from "./components/ApprovedBrowser";
import { AuditMode } from "./components/AuditMode";
import { QueueAuditView } from "./components/QueueAuditView";
import { RejectedBrowser } from "./components/RejectedBrowser";
import { GearMenu } from "./components/GearMenu";
import AuthButton from "@/components/AuthButton";

export default function CuratorPage() {
  const [activeTab, setActiveTab] = useState<CuratorTab>("review");
  const [selectedLabels, setSelectedLabels] = useState<Set<string>>(new Set());
  const [isStarred, setIsStarred] = useState(false);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [approvedView, setApprovedView] = useState<ApprovedView>({
    mode: "landing",
  });
  const [gearOpen, setGearOpen] = useState(false);

  const {
    data,
    setData,
    loading,
    stats,
    approvedChannels,
    setApprovedChannels,
    approvedLoading,
    rejectedChannels,
    rejectedLoading,
    filteredChannels,
    filteredLoading,
    newSubCount,
    setNewSubCount,
    subCheckError,
    fetchNext,
    fetchStats,
    fetchApproved,
    fetchRejected,
    fetchFiltered,
    fetchCoverage,
    fetchHealth,
    checkSubs,
  } = useCuratorData();

  const importProps = useImport({ fetchNext, fetchStats });

  const {
    acting,
    history,
    rescanning,
    handleDecision,
    handleGoBack,
    handleToggleStar,
    handleSkip,
    handleReviewSkipped,
    handleRescan,
  } = useCuratorActions({
    data,
    setData,
    fetchNext,
    fetchStats,
    selectedLabels,
    isStarred,
    setIsStarred,
    setSelectedLabels,
    setPlayingVideoId,
  });

  // Sync starred state from data
  useEffect(() => {
    if (data) setIsStarred(data.isStarred || false);
  }, [data]);

  // Fetch approved list when switching to library tab
  useEffect(() => {
    if (activeTab === "library") fetchApproved();
  }, [activeTab, fetchApproved]);

  // Fetch rejected + filtered when switching to rejected tab
  useEffect(() => {
    if (activeTab === "rejected") {
      fetchRejected();
      fetchFiltered();
    }
  }, [activeTab, fetchRejected, fetchFiltered]);

  // Reset to landing when switching to library tab
  useEffect(() => {
    if (activeTab === "library") {
      setApprovedView({ mode: "landing" });
    }
  }, [activeTab]);

  // Reset labels when data changes (new channel)
  useEffect(() => {
    setSelectedLabels(new Set());
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

  // Audit mode handlers
  const handleEnterAudit = useCallback((ch: ApprovedChannel) => {
    setApprovedView({ mode: "direct-audit", channel: ch });
  }, []);

  const handleExitAudit = useCallback(() => {
    setApprovedView({ mode: "landing" });
    fetchApproved();
    fetchStats();
  }, [fetchApproved, fetchStats]);

  const handleStartQueue = useCallback(
    async (queueType: QueueType, channels: ApprovedChannel[]) => {
      if (queueType === "spot-check-rejected") {
        await fetchRejected();
        const res = await fetch("/api/curator?mode=rejected");
        const json = await res.json();
        const rejected = (json.channels || []) as ApprovedChannel[];
        setApprovedView({ mode: "queue", queueType, channels: rejected });
      } else {
        setApprovedView({ mode: "queue", queueType, channels });
      }
    },
    [fetchRejected]
  );

  const handleChangeDecision = useCallback(
    async (
      channelId: string,
      channelName: string,
      newDecision: "reject" | "unsubscribe"
    ) => {
      await fetch("/api/curator", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "changeDecision",
          channelId,
          channelName,
          newDecision,
        }),
      });
      setApprovedChannels((prev) =>
        prev.filter((c) => c.id !== channelId)
      );
      setApprovedView({ mode: "landing" });
      fetchStats();
    },
    [fetchStats, setApprovedChannels]
  );

  const handleSaveAuditLabels = useCallback(async () => {
    // Placeholder — AuditMode handles its own label save
  }, []);

  const handleToggleStarAudit = useCallback(async () => {
    // Placeholder — AuditMode handles its own star toggle
  }, []);

  const handleAuditRescan = useCallback(async () => {
    // Placeholder — AuditMode handles its own rescan
  }, []);

  // Quick import from empty state (single URL)
  const handleQuickImport = useCallback(
    async (url: string) => {
      const res = await fetch("/api/curator/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: url }),
      });
      const result = await res.json();
      if (result.added?.length > 0) {
        fetchNext();
        fetchStats();
      }
    },
    [fetchNext, fetchStats]
  );

  // Import new YouTube subscriptions
  const handleImportSubscriptions = useCallback(async () => {
    const res = await fetch("/api/curator/subscriptions", { method: "POST" });
    const result = await res.json();
    if (result.added > 0 || result.filtered > 0) {
      setNewSubCount(0);
      fetchNext();
      fetchStats();
    }
  }, [fetchNext, fetchStats, setNewSubCount]);

  // Rescue a filtered channel → move to review queue
  const handleRescueFiltered = useCallback(
    async (channelId: string, channelName: string) => {
      await fetch("/api/curator", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rescueFiltered", channelId, channelName }),
      });
      fetchFiltered();
      fetchNext();
      fetchStats();
    },
    [fetchFiltered, fetchNext, fetchStats]
  );

  // Rescue a rejected channel → move to approved
  const handleRescueRejected = useCallback(
    async (channelId: string, channelName: string) => {
      await fetch("/api/curator", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rescueChannel", channelId, channelName }),
      });
      fetchRejected();
      fetchStats();
    },
    [fetchRejected, fetchStats]
  );

  // Refresh handler for empty state
  const handleRefresh = useCallback(() => {
    fetchNext();
    fetchStats();
    checkSubs();
  }, [fetchNext, fetchStats, checkSubs]);

  // Only use keyboard shortcuts when NOT in queue mode
  const auditChannel =
    approvedView.mode === "direct-audit" ? approvedView.channel : null;

  useKeyboardShortcuts({
    activeTab,
    setActiveTab,
    handleDecision,
    handleSkip,
    handleGoBack,
    handleToggleStar,
    handleRescan,
    setPlayingVideoId,
    auditChannel,
    handleSaveAuditLabels,
    handleChangeDecision,
    handleToggleStarAudit,
    handleAuditRescan,
    exitAudit: handleExitAudit,
  });

  // --- Render ---

  // Queue mode (full screen takeover)
  if (activeTab === "library" && approvedView.mode === "queue") {
    return (
      <QueueAuditView
        queueType={approvedView.queueType}
        initialChannels={approvedView.channels}
        stats={stats}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onExit={handleExitAudit}
        fetchStats={fetchStats}
        onChannelRescued={() => fetchApproved()}
        onChannelRemoved={(id) =>
          setApprovedChannels((prev) => prev.filter((c) => c.id !== id))
        }
      />
    );
  }

  // Direct audit mode (full screen takeover) — from library or rejected tab
  if (approvedView.mode === "direct-audit") {
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

  // Loading
  if (loading && activeTab === "review") {
    return (
      <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex items-center justify-center font-mono">
        <span className="animate-pulse">LOADING...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] font-mono">
      <div className="max-w-7xl mx-auto px-4 py-3 lg:px-8 lg:py-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-5">
            <a
              href="/"
              className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors text-2xl leading-none"
            >
              &larr;
            </a>
            <h1 className="text-lg font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]">
              CURATOR
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <AuthButton />
            {/* Gear icon */}
            <button
              onClick={() => setGearOpen((v) => !v)}
              className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors text-lg"
              title="Ops tools"
            >
              &#9881;
            </button>
            {activeTab === "review" && data?.channel && (
              <div className="text-right space-y-1">
                <span className="text-[var(--text)] text-sm font-bold block tabular-nums">
                  {data.reviewed}
                  <span className="text-[var(--text-muted)] font-normal">
                    {" "}
                    / {data.total}
                  </span>
                </span>
                <span className="text-[var(--text-muted)] text-[11px] tracking-wide">
                  {data.approvedCount} approved &middot;{" "}
                  {data.starredCount || 0} starred &middot;{" "}
                  {data.unsubCount} unsub &middot; {data.remaining} left
                </span>
              </div>
            )}
          </div>
        </div>

        <CuratorStatsBar stats={stats} newSubCount={newSubCount} />
        <CuratorTabBar
          activeTab={activeTab}
          onChange={setActiveTab}
          pendingCount={stats?.pending}
          rejectedCount={stats?.rejected}
          filteredCount={filteredChannels.length}
        />

        {/* Sync Banner — shows in review tab when new subs detected */}
        {activeTab === "review" && newSubCount > 0 && !data?.done && (
          <div className="mb-4 flex items-center justify-between px-4 py-3 border border-[var(--text-secondary)]/30 bg-[var(--bg-alt)] rounded-lg">
            <span className="text-sm text-[var(--text-secondary)]">
              <span className="font-bold">{newSubCount}</span> new channel{newSubCount !== 1 ? "s" : ""} from your subscriptions
            </span>
            <button
              onClick={handleImportSubscriptions}
              className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider bg-[var(--text-secondary)] text-[var(--bg)] hover:opacity-80 transition-opacity rounded"
            >
              IMPORT
            </button>
          </div>
        )}

        {/* Tab content */}
        {activeTab === "review" && (
          <>
            {data?.done ? (
              <ReviewEmptyState
                approvedCount={data.approvedCount || 0}
                total={data.total}
                skippedCount={data.skippedCount || 0}
                onReviewSkipped={handleReviewSkipped}
                onQuickImport={handleQuickImport}
                onImportSubscriptions={handleImportSubscriptions}
                importing={importProps.importing}
                onRefresh={handleRefresh}
                newSubCount={newSubCount}
                subCheckError={subCheckError}
              />
            ) : data?.channel ? (
              <ReviewQueue
                data={data}
                acting={acting}
                history={history}
                rescanning={rescanning}
                isStarred={isStarred}
                selectedLabels={selectedLabels}
                onToggleLabel={toggleLabel}
                onDecision={handleDecision}
                onSkip={handleSkip}
                onGoBack={handleGoBack}
                onToggleStar={handleToggleStar}
                onRescan={handleRescan}
              />
            ) : null}
          </>
        )}

        {activeTab === "library" && (
          <ApprovedBrowser
            channels={approvedChannels}
            loading={approvedLoading}
            onEnterAudit={handleEnterAudit}
            onStartQueue={handleStartQueue}
          />
        )}

        {activeTab === "rejected" && (
          <RejectedBrowser
            rejectedChannels={rejectedChannels}
            filteredChannels={filteredChannels}
            rejectedLoading={rejectedLoading}
            filteredLoading={filteredLoading}
            onRescueFiltered={handleRescueFiltered}
            onRescueRejected={handleRescueRejected}
            onStartQueue={handleStartQueue}
            onEnterAudit={handleEnterAudit}
          />
        )}
      </div>

      {/* Gear Menu overlay */}
      <GearMenu
        open={gearOpen}
        onClose={() => setGearOpen(false)}
        fetchCoverage={fetchCoverage}
        fetchHealth={fetchHealth}
        fetchStats={fetchStats}
        importProps={importProps}
        skippedCount={stats?.skipped || 0}
        onReviewSkipped={handleReviewSkipped}
        setActiveTab={setActiveTab}
      />
    </div>
  );
}

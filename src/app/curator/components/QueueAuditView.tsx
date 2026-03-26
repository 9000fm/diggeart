"use client";

import { useState, useCallback, useEffect } from "react";
import type { ApprovedChannel, QueueType, CuratorStats } from "../types";
import { useQueueState } from "../hooks/useQueueState";
import { ChannelAuditBody } from "./ChannelAuditBody";
import { CuratorStatsBar } from "./CuratorStatsBar";
import { CuratorTabBar } from "./CuratorTabBar";
import type { CuratorTab } from "../types";

interface QueueAuditViewProps {
  queueType: QueueType;
  initialChannels: ApprovedChannel[];
  stats: CuratorStats | null;
  activeTab: CuratorTab;
  setActiveTab: (tab: CuratorTab) => void;
  onExit: () => void;
  fetchStats: () => void;
  /** Called after a channel is rescued/approved from rejected */
  onChannelRescued?: () => void;
  /** Called after a channel is rejected/removed from approved */
  onChannelRemoved?: (channelId: string) => void;
}

const QUEUE_TITLES: Record<QueueType, string> = {
  "tag-untagged": "TAG UNTAGGED",
  "spot-check-rejected": "SPOT-CHECK REJECTED",
  "re-audit-starred": "RE-AUDIT STARRED",
};

export function QueueAuditView({
  queueType,
  initialChannels,
  stats,
  activeTab,
  setActiveTab,
  onExit,
  fetchStats,
  onChannelRescued,
  onChannelRemoved,
}: QueueAuditViewProps) {
  const { current, progress, advance, remove, goBack, canGoBack, isDone } =
    useQueueState(initialChannels);
  const [labels, setLabels] = useState<Set<string>>(new Set());
  const [isStarred, setIsStarred] = useState(false);
  const [acting, setActing] = useState(false);

  // Reset labels/star when channel changes
  useEffect(() => {
    if (current) {
      setLabels(new Set(current.labels || []));
      setIsStarred(current.isStarred || false);
    }
  }, [current?.id]);

  const toggleLabel = useCallback((label: string) => {
    setLabels((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }, []);

  const handleToggleStar = useCallback(async () => {
    if (!current) return;
    const res = await fetch("/api/curator", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channelId: current.id,
        channelName: current.name,
      }),
    });
    const result = await res.json();
    setIsStarred(result.starred);
    fetchStats();
  }, [current, fetchStats]);

  // --- Actions ---

  const handleSaveLabels = useCallback(async () => {
    if (!current || acting) return;
    setActing(true);
    await fetch("/api/curator", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "updateLabels",
        channelId: current.id,
        labels: Array.from(labels),
      }),
    });
    fetchStats();
    setActing(false);
    remove(); // tagged → remove from untagged queue
  }, [current, labels, acting, fetchStats, remove]);

  const handleRescue = useCallback(async () => {
    if (!current || acting) return;
    setActing(true);
    await fetch("/api/curator", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "rescueChannel",
        channelId: current.id,
        channelName: current.name,
        labels: Array.from(labels),
      }),
    });
    fetchStats();
    onChannelRescued?.();
    setActing(false);
    remove();
  }, [current, labels, acting, fetchStats, onChannelRescued, remove]);

  const handleReject = useCallback(async () => {
    if (!current || acting) return;
    setActing(true);
    await fetch("/api/curator", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "changeDecision",
        channelId: current.id,
        channelName: current.name,
        newDecision: "reject",
      }),
    });
    fetchStats();
    onChannelRemoved?.(current.id);
    setActing(false);
    remove();
  }, [current, acting, fetchStats, onChannelRemoved, remove]);

  const handleUnsub = useCallback(async () => {
    if (!current || acting) return;
    setActing(true);
    await fetch("/api/curator", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "changeDecision",
        channelId: current.id,
        channelName: current.name,
        newDecision: "unsubscribe",
      }),
    });
    fetchStats();
    onChannelRemoved?.(current.id);
    setActing(false);
    remove();
  }, [current, acting, fetchStats, onChannelRemoved, remove]);

  const handleSkip = useCallback(() => {
    advance();
  }, [advance]);

  const handleUnstar = useCallback(async () => {
    if (!current) return;
    await fetch("/api/curator", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channelId: current.id,
        channelName: current.name,
      }),
    });
    fetchStats();
    remove();
  }, [current, fetchStats, remove]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      if (e.key === "Escape") {
        onExit();
        return;
      }

      if (isDone) return;

      const key = e.key.toLowerCase();

      if (key === "l") {
        if (queueType === "tag-untagged" || queueType === "re-audit-starred") {
          handleSaveLabels();
        } else if (queueType === "spot-check-rejected") {
          handleRescue();
        }
        return;
      }
      if (key === "n" || key === " ") {
        e.preventDefault();
        if (queueType === "spot-check-rejected") {
          handleSkip(); // confirmed reject — move on
        } else {
          handleSkip();
        }
        return;
      }
      if (key === "r") {
        if (queueType === "spot-check-rejected") {
          handleRescue();
        } else {
          handleReject();
        }
        return;
      }
      if (key === "u") {
        handleUnsub();
        return;
      }
      if (key === "f") {
        handleToggleStar();
        return;
      }
      if (key === "b") {
        if (canGoBack) goBack();
        return;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    isDone,
    queueType,
    handleSaveLabels,
    handleRescue,
    handleReject,
    handleUnsub,
    handleSkip,
    handleToggleStar,
    handleUnstar,
    canGoBack,
    goBack,
    onExit,
  ]);

  // Done state
  if (isDone) {
    return (
      <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] font-mono">
        <div className="max-w-7xl mx-auto px-4 py-3 lg:px-8 lg:py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-5">
              <button
                onClick={onExit}
                className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors text-2xl leading-none"
              >
                &larr;
              </button>
              <h1 className="text-lg font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                CURATOR
              </h1>
            </div>
          </div>
          <CuratorStatsBar stats={stats} />
          <CuratorTabBar activeTab={activeTab} onChange={setActiveTab} />

          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-2xl font-bold mb-2">QUEUE COMPLETE</p>
            <p className="text-[var(--text-muted)] text-sm mb-6">
              {QUEUE_TITLES[queueType]} — all channels processed
            </p>
            <button
              onClick={onExit}
              className="px-6 py-2.5 bg-[var(--bg-alt)] border border-[var(--border)] text-sm uppercase tracking-wider hover:border-[var(--text-muted)] transition-colors"
            >
              BACK TO LIBRARY
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] font-mono">
      <div className="max-w-7xl mx-auto px-4 py-3 lg:px-8 lg:py-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-5">
            <button
              onClick={onExit}
              className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors text-2xl leading-none"
            >
              &larr;
            </button>
            <h1 className="text-lg font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]">
              CURATOR
            </h1>
          </div>
          <div className="text-right">
            <span className="text-[var(--text)] text-sm font-bold tabular-nums">
              {progress.index + 1}
              <span className="text-[var(--text-muted)] font-normal">
                {" "}
                / {progress.total}
              </span>
            </span>
            <span className="block text-[var(--text-muted)] text-[11px] tracking-wide uppercase">
              {QUEUE_TITLES[queueType]}
            </span>
          </div>
        </div>

        <CuratorStatsBar stats={stats} />
        <CuratorTabBar activeTab={activeTab} onChange={setActiveTab} />

        <ChannelAuditBody
          key={current.id}
          channel={current}
          labels={labels}
          onToggleLabel={toggleLabel}
          onToggleStar={handleToggleStar}
          isStarred={isStarred}
        />
      </div>

      {/* Fixed bottom action bar — varies by queue type */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--bg)] border-t border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-3">
          <div className="flex gap-3 mb-2">
            {queueType === "tag-untagged" && (
              <>
                <button
                  onClick={handleSaveLabels}
                  disabled={acting}
                  className="relative flex-[2] flex items-center rounded-none bg-emerald-600 text-white transition-all duration-100 hover:shadow-[0_4px_20px_rgba(0,0,0,0.3)] active:scale-[0.93] active:shadow-none disabled:opacity-50"
                >
                  <div className="w-1.5 self-stretch bg-emerald-400 shrink-0" />
                  <div className="flex-1 flex items-center justify-between px-4 py-2.5">
                    <span className="text-sm font-bold uppercase tracking-[0.15em]">
                      SAVE LABELS
                    </span>
                    <kbd className="text-[9px] font-normal opacity-60 border border-current/20 px-1.5 py-0.5">
                      L
                    </kbd>
                  </div>
                </button>
                <button
                  onClick={handleSkip}
                  className="relative flex-1 flex items-center rounded-none bg-[var(--bg-alt)] text-[var(--text-muted)] transition-all duration-100 hover:text-[var(--text)] hover:bg-[var(--border)] active:scale-[0.93]"
                >
                  <div className="w-1 self-stretch bg-[var(--text-muted)] shrink-0" />
                  <div className="flex-1 flex items-center justify-between px-3 py-2.5">
                    <span className="text-xs font-bold uppercase tracking-wider">
                      SKIP
                    </span>
                    <kbd className="text-[9px] font-normal opacity-40 border border-[var(--border)] px-1.5 py-0.5">
                      N
                    </kbd>
                  </div>
                </button>
                <button
                  onClick={handleReject}
                  disabled={acting}
                  className="relative flex-1 flex items-center rounded-none bg-[var(--bg-alt)] text-[var(--text-muted)] transition-all duration-100 hover:text-[var(--text)] hover:bg-[var(--border)] active:scale-[0.93] disabled:opacity-50"
                >
                  <div className="w-1 self-stretch bg-[var(--text-muted)] shrink-0" />
                  <div className="flex-1 flex items-center justify-between px-3 py-2.5">
                    <span className="text-xs font-bold uppercase tracking-wider">
                      &times; REJECT
                    </span>
                    <kbd className="text-[9px] font-normal opacity-40 border border-[var(--border)] px-1.5 py-0.5">
                      R
                    </kbd>
                  </div>
                </button>
                <button
                  onClick={handleUnsub}
                  disabled={acting}
                  className="relative flex-1 flex items-center rounded-none bg-red-500/5 text-red-400 transition-all duration-100 hover:bg-red-500 hover:text-white active:scale-[0.93] disabled:opacity-50"
                >
                  <div className="w-1 self-stretch bg-red-500 shrink-0" />
                  <div className="flex-1 flex items-center justify-between px-3 py-2.5">
                    <span className="text-xs font-bold uppercase tracking-wider">
                      &oslash; UNSUB
                    </span>
                    <kbd className="text-[9px] font-normal opacity-40 border border-current/20 px-1.5 py-0.5">
                      U
                    </kbd>
                  </div>
                </button>
              </>
            )}

            {queueType === "spot-check-rejected" && (
              <>
                <button
                  onClick={handleRescue}
                  disabled={acting}
                  className="relative flex-[2] flex items-center rounded-none bg-emerald-600 text-white transition-all duration-100 hover:shadow-[0_4px_20px_rgba(0,0,0,0.3)] active:scale-[0.93] active:shadow-none disabled:opacity-50"
                >
                  <div className="w-1.5 self-stretch bg-emerald-400 shrink-0" />
                  <div className="flex-1 flex items-center justify-between px-4 py-2.5">
                    <span className="text-sm font-bold uppercase tracking-[0.15em]">
                      APPROVE
                    </span>
                    <kbd className="text-[9px] font-normal opacity-60 border border-current/20 px-1.5 py-0.5">
                      R
                    </kbd>
                  </div>
                </button>
                <button
                  onClick={handleSkip}
                  className="relative flex-1 flex items-center rounded-none bg-[var(--bg-alt)] text-[var(--text-muted)] transition-all duration-100 hover:text-[var(--text)] hover:bg-[var(--border)] active:scale-[0.93]"
                >
                  <div className="w-1 self-stretch bg-[var(--text-muted)] shrink-0" />
                  <div className="flex-1 flex items-center justify-between px-3 py-2.5">
                    <span className="text-xs font-bold uppercase tracking-wider">
                      NEXT
                    </span>
                    <kbd className="text-[9px] font-normal opacity-40 border border-[var(--border)] px-1.5 py-0.5">
                      N
                    </kbd>
                  </div>
                </button>
                <button
                  onClick={handleUnsub}
                  disabled={acting}
                  className="relative flex-1 flex items-center rounded-none bg-red-500/5 text-red-400 transition-all duration-100 hover:bg-red-500 hover:text-white active:scale-[0.93] disabled:opacity-50"
                >
                  <div className="w-1 self-stretch bg-red-500 shrink-0" />
                  <div className="flex-1 flex items-center justify-between px-3 py-2.5">
                    <span className="text-xs font-bold uppercase tracking-wider">
                      &oslash; UNSUB
                    </span>
                    <kbd className="text-[9px] font-normal opacity-40 border border-current/20 px-1.5 py-0.5">
                      U
                    </kbd>
                  </div>
                </button>
              </>
            )}

            {queueType === "re-audit-starred" && (
              <>
                <button
                  onClick={handleSaveLabels}
                  disabled={acting}
                  className="relative flex-[2] flex items-center rounded-none bg-emerald-600 text-white transition-all duration-100 hover:shadow-[0_4px_20px_rgba(0,0,0,0.3)] active:scale-[0.93] active:shadow-none disabled:opacity-50"
                >
                  <div className="w-1.5 self-stretch bg-emerald-400 shrink-0" />
                  <div className="flex-1 flex items-center justify-between px-4 py-2.5">
                    <span className="text-sm font-bold uppercase tracking-[0.15em]">
                      SAVE LABELS
                    </span>
                    <kbd className="text-[9px] font-normal opacity-60 border border-current/20 px-1.5 py-0.5">
                      L
                    </kbd>
                  </div>
                </button>
                <button
                  onClick={handleUnstar}
                  className="relative flex-1 flex items-center rounded-none bg-[var(--bg-alt)] text-[var(--text-muted)] transition-all duration-100 hover:text-[var(--text)] hover:bg-[var(--border)] active:scale-[0.93]"
                >
                  <div className="w-1 self-stretch bg-amber-400 shrink-0" />
                  <div className="flex-1 flex items-center justify-between px-3 py-2.5">
                    <span className="text-xs font-bold uppercase tracking-wider">
                      UNSTAR
                    </span>
                    <kbd className="text-[9px] font-normal opacity-40 border border-[var(--border)] px-1.5 py-0.5">
                      N
                    </kbd>
                  </div>
                </button>
                <button
                  onClick={handleReject}
                  disabled={acting}
                  className="relative flex-1 flex items-center rounded-none bg-[var(--bg-alt)] text-[var(--text-muted)] transition-all duration-100 hover:text-[var(--text)] hover:bg-[var(--border)] active:scale-[0.93] disabled:opacity-50"
                >
                  <div className="w-1 self-stretch bg-[var(--text-muted)] shrink-0" />
                  <div className="flex-1 flex items-center justify-between px-3 py-2.5">
                    <span className="text-xs font-bold uppercase tracking-wider">
                      &times; REJECT
                    </span>
                    <kbd className="text-[9px] font-normal opacity-40 border border-[var(--border)] px-1.5 py-0.5">
                      R
                    </kbd>
                  </div>
                </button>
                <button
                  onClick={handleUnsub}
                  disabled={acting}
                  className="relative flex-1 flex items-center rounded-none bg-red-500/5 text-red-400 transition-all duration-100 hover:bg-red-500 hover:text-white active:scale-[0.93] disabled:opacity-50"
                >
                  <div className="w-1 self-stretch bg-red-500 shrink-0" />
                  <div className="flex-1 flex items-center justify-between px-3 py-2.5">
                    <span className="text-xs font-bold uppercase tracking-wider">
                      &oslash; UNSUB
                    </span>
                    <kbd className="text-[9px] font-normal opacity-40 border border-current/20 px-1.5 py-0.5">
                      U
                    </kbd>
                  </div>
                </button>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onExit}
              className="py-1.5 px-4 text-[11px] uppercase tracking-wider text-[var(--text-muted)] rounded-none border border-transparent transition-all duration-100 hover:border-[var(--border)] hover:text-[var(--text)] active:scale-[0.93]"
            >
              <span className="inline-flex items-center gap-2">
                &larr; EXIT QUEUE{" "}
                <kbd className="text-[9px] opacity-40 border border-[var(--border)] px-1 py-0.5">
                  ESC
                </kbd>
              </span>
            </button>
            <div className="ml-auto text-[var(--text-muted)] text-[11px] tracking-wider tabular-nums">
              {progress.index + 1} of {progress.total}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

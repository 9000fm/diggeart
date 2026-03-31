"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ApprovedChannel, CuratorStats } from "../types";
import { ChannelAuditBody } from "./ChannelAuditBody";
import { CuratorStatsBar } from "./CuratorStatsBar";
import { CuratorTabBar } from "./CuratorTabBar";
import type { CuratorTab } from "../types";

interface AuditModeProps {
  channel: ApprovedChannel;
  stats: CuratorStats | null;
  activeTab: CuratorTab;
  setActiveTab: (tab: CuratorTab) => void;
  onExit: () => void;
  onChangeDecision: (
    id: string,
    name: string,
    d: "reject"
  ) => void;
  fetchStats: () => void;
  onRescan?: () => void;
}

export function AuditMode({
  channel,
  stats,
  activeTab,
  setActiveTab,
  onExit,
  onChangeDecision,
  fetchStats,
  onRescan,
}: AuditModeProps) {
  const [labels, setLabels] = useState<Set<string>>(
    new Set(channel.labels || [])
  );
  const [auditChannel, setAuditChannel] = useState(channel);
  const [saveFlash, setSaveFlash] = useState(false);
  const flashTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleSaveLabels = useCallback(() => {
    const labelArr = Array.from(labels);
    // Fire-and-forget
    fetch("/api/curator", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "updateLabels",
        channelId: channel.id,
        labels: labelArr,
      }),
    }).catch(console.error);
    // Visual feedback
    if (flashTimeout.current) clearTimeout(flashTimeout.current);
    setSaveFlash(true);
    flashTimeout.current = setTimeout(() => setSaveFlash(false), 400);
  }, [channel.id, labels]);

  const handleToggleStar = useCallback(() => {
    setAuditChannel((prev) => ({ ...prev, isStarred: !prev.isStarred }));
    fetch("/api/curator", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channelId: channel.id,
        channelName: channel.name,
      }),
    }).then(() => fetchStats()).catch(console.error);
  }, [channel.id, channel.name, fetchStats]);

  const toggleLabel = (label: string) => {
    setLabels((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const handleReject = useCallback(() => {
    if (!window.confirm(`Reject "${channel.name}"? This removes it from approved channels.`)) return;
    onChangeDecision(channel.id, channel.name, "reject");
  }, [channel.id, channel.name, onChangeDecision]);

  // Keyboard shortcuts for audit mode
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "l" || e.key === "L") handleSaveLabels();
      if (e.key === "r" || e.key === "R") handleReject();
      if (e.key === "f" || e.key === "F") handleToggleStar();
      if (e.key === "b" || e.key === "B" || e.key === "Escape") onExit();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSaveLabels, handleToggleStar, handleReject, onExit]);

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
            <button onClick={onExit} className="text-3xl font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors">
              CURATOR
            </button>
          </div>
        </div>

        <CuratorStatsBar stats={stats} />
        <CuratorTabBar activeTab={activeTab} onChange={setActiveTab} />

        <ChannelAuditBody
          channel={auditChannel}
          labels={labels}
          onToggleLabel={toggleLabel}
          onToggleStar={handleToggleStar}
          isStarred={auditChannel.isStarred}
        />
      </div>

      {/* Fixed bottom audit action bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--bg)] border-t border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-3">
          <div className="flex gap-3 mb-2">
            <button
              onClick={handleSaveLabels}
              className="relative flex-[2] flex items-center rounded-none bg-emerald-600 text-white transition-all duration-100 hover:shadow-[0_4px_20px_rgba(0,0,0,0.3)] active:scale-[0.93] active:shadow-none overflow-hidden"
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
              <AnimatePresence>
                {saveFlash && (
                  <motion.div
                    key="save-flash"
                    initial={{ opacity: 0.7 }}
                    animate={{ opacity: 0 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    className="absolute inset-0 bg-emerald-400 pointer-events-none"
                  />
                )}
              </AnimatePresence>
            </button>
            <button
              onClick={handleReject}
              className="relative flex-1 flex items-center rounded-none bg-[var(--bg-alt)] text-[var(--text-muted)] transition-all duration-100 hover:text-[var(--text)] hover:bg-[var(--border)] active:scale-[0.93]"
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
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onExit}
              className="py-1.5 px-4 text-[11px] uppercase tracking-wider text-[var(--text-muted)] rounded-none border border-transparent transition-all duration-100 hover:border-[var(--border)] hover:text-[var(--text)] active:scale-[0.93]"
            >
              <span className="inline-flex items-center gap-2">
                &larr; BACK{" "}
                <kbd className="text-[9px] opacity-40 border border-[var(--border)] px-1 py-0.5">
                  ESC
                </kbd>
              </span>
            </button>
            <div className="ml-auto flex items-center gap-3 text-[var(--text-muted)] text-[11px] tracking-wider uppercase">
              <span>
                <kbd className="text-[9px] opacity-50 border border-[var(--border)] px-1 py-0.5 rounded-sm mr-1">
                  L
                </kbd>
                Save
              </span>
              <span>
                <kbd className="text-[9px] opacity-50 border border-[var(--border)] px-1 py-0.5 rounded-sm mr-1">
                  R
                </kbd>
                Reject
              </span>
              <span>
                <kbd className="text-[9px] opacity-50 border border-[var(--border)] px-1 py-0.5 rounded-sm mr-1">
                  F
                </kbd>
                Star
              </span>
              <span>
                <kbd className="text-[9px] opacity-50 border border-[var(--border)] px-1 py-0.5 rounded-sm mr-1">
                  X
                </kbd>
                Rescan
              </span>
              <span>
                <kbd className="text-[9px] opacity-50 border border-[var(--border)] px-1 py-0.5 rounded-sm mr-1">
                  B
                </kbd>
                Back
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

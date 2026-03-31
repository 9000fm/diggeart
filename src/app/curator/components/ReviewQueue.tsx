"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { CuratorData } from "../types";
import { GenreLabels } from "./GenreLabels";
import { ChannelUploadGrid } from "./ChannelUploadGrid";

interface ReviewQueueProps {
  data: CuratorData;
  acting: boolean;
  history: { id: string }[];
  rescanning: boolean;
  isStarred: boolean;
  selectedLabels: Set<string>;
  onToggleLabel: (label: string) => void;
  onDecision: (d: "approve" | "reject") => void;
  onGoBack: () => void;
  onToggleStar: (starred: boolean) => void;
  onRescan: () => void;
  onSkip: () => void;
  onExit: () => void;
  notes: string;
  onNotesChange: (notes: string) => void;
}

export function ReviewQueue({
  data,
  acting,
  history,
  rescanning,
  isStarred,
  selectedLabels,
  onToggleLabel,
  onDecision,
  onGoBack,
  onToggleStar,
  onRescan,
  onSkip,
  onExit,
  notes,
  onNotesChange,
}: ReviewQueueProps) {
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [localStarred, setLocalStarred] = useState(isStarred);
  const [flash, setFlash] = useState<"approve" | "reject" | null>(null);
  const flashTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const channel = data.channel;
  const uploads = data.uploads || [];

  // Sync from parent
  useEffect(() => { setLocalStarred(isStarred); }, [isStarred]);

  // Cleanup flash timeout on unmount
  useEffect(() => () => { if (flashTimeout.current) clearTimeout(flashTimeout.current); }, []);

  // Optimistic star toggle — instant UI, API in background
  // Optimistic toggle — instant UI, API in background
  const toggleStar = useCallback(() => {
    if (!channel) return;
    const newStarred = !localStarred;
    setLocalStarred(newStarred);
    onToggleStar(newStarred);
    fetch("/api/curator", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelId: channel.id, channelName: channel.name }),
    }).catch(console.error);
  }, [channel, localStarred, onToggleStar]);

  const fireDecision = useCallback((d: "approve" | "reject") => {
    if (flashTimeout.current) clearTimeout(flashTimeout.current);
    setFlash(d);
    onDecision(d);
    flashTimeout.current = setTimeout(() => setFlash(null), 400);
  }, [onDecision]);

  // Own keyboard shortcuts — ensures F/A/R/B/X/ESC always work
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "a" || e.key === "A") fireDecision("approve");
      if (e.key === "r" || e.key === "R") fireDecision("reject");
      if (e.key === "f" || e.key === "F") toggleStar();
      if (e.key === "s" || e.key === "S") onSkip();
      if (e.key === "x" || e.key === "X") onRescan();
      if (e.key === "b" || e.key === "B") onGoBack();
      if (e.key === "q" || e.key === "Q") onExit();
      if (e.key === "Escape") {
        if (playingVideoId) setPlayingVideoId(null);
        else onExit();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [fireDecision, toggleStar, onSkip, onGoBack, onRescan, onExit, playingVideoId]);

  if (!channel) return null;

  return (
    <>
      {/* Channel header — single row */}
      <div className="mb-2">
        <div className="flex items-center gap-5 mb-1.5">
          <h2 className="text-3xl font-bold tracking-tight">{channel.name}</h2>
          <a
            href={`https://www.youtube.com/channel/${channel.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--text-muted)]/50 hover:text-[var(--text)] transition-colors"
            title="View on YouTube"
          >
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8zM9.5 15.6V8.4l6.3 3.6-6.3 3.6z"/></svg>
          </a>
          <button
            onClick={onRescan}
            disabled={rescanning}
            className="text-[var(--text-muted)]/50 hover:text-[var(--text)] transition-colors disabled:opacity-40"
            title="Rescan uploads (X)"
          >
            <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
            </svg>
          </button>
          <button
            onClick={toggleStar}
            className={`transition-all duration-200 active:scale-150 ${
              localStarred
                ? "text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                : "text-[var(--text-muted)]/30 hover:text-amber-400"
            }`}
            title={localStarred ? "Unstar (F)" : "Star (F)"}
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" fill={localStarred ? "currentColor" : "none"}>
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </button>
          {localStarred && (
            <span className="text-[10px] text-amber-400 uppercase tracking-[0.2em] font-bold animate-pulse">
              STARRED
            </span>
          )}
        </div>
        {/* YouTube topics — subtle text line */}
        {data.topics && data.topics.length > 0 && (
          <div className="flex items-center gap-4 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider bg-[var(--text-muted)]/15 text-[var(--text-muted)] px-3 py-1 rounded-full">CATEGORY</span>
            <span className="text-base font-semibold text-[var(--text)]">
              {data.topics.map((t, i) => (
                <span key={t}>
                  <span>
                    {t}
                  </span>
                  {i < data.topics!.length - 1 && <span className="mx-2 font-normal text-[var(--text)]">&middot;</span>}
                </span>
              ))}
            </span>
          </div>
        )}
      </div>

      <GenreLabels selected={selectedLabels} onToggle={onToggleLabel} />

      {/* Notes */}
      <div className="mb-2">
        <span className="text-[9px] uppercase tracking-wider text-[var(--text-muted)]/50 font-medium">Note</span>
        <input
          type="text"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="e.g. embed disabled, vinyl only, great selection..."
          className="w-full bg-transparent border-b border-[var(--border)] px-1 py-1.5 text-xs text-[var(--text)] placeholder:text-[var(--text-muted)]/60 focus:outline-none focus:border-[var(--text-secondary)] transition-colors font-mono"
        />
      </div>

      {/* Uploads */}
      <div className="pb-36">
        <h3 className="text-[11px] text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2">
          UPLOADS
        </h3>
        <ChannelUploadGrid
          uploads={uploads}
          playingVideoId={playingVideoId}
          setPlayingVideoId={setPlayingVideoId}
        />
      </div>

      {/* Fixed bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--bg)] border-t border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-2">
          <div className="flex gap-2 mb-1.5">
            <button
              onClick={() => fireDecision("approve")}
              disabled={acting}
              className="relative flex-[3] flex items-center rounded-none bg-emerald-600 text-white transition-all duration-100 hover:bg-emerald-500 hover:shadow-[0_4px_20px_rgba(16,185,129,0.3)] active:scale-[0.93] active:shadow-none disabled:opacity-30 disabled:hover:shadow-none disabled:active:scale-100 overflow-hidden"
            >
              <div className="w-1.5 self-stretch bg-emerald-400 shrink-0" />
              <div className="flex-1 flex items-center justify-between px-3 py-1.5">
                <span className="text-xs font-bold uppercase tracking-[0.15em]">
                  + APPROVE
                </span>
                <kbd className="text-[8px] font-normal opacity-60 border border-current/20 px-1 py-px">
                  A
                </kbd>
              </div>
              <AnimatePresence>
                {flash === "approve" && (
                  <motion.div
                    key="approve-flash"
                    initial={{ opacity: 0.7 }}
                    animate={{ opacity: 0 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    className="absolute inset-0 bg-emerald-400 pointer-events-none"
                  />
                )}
              </AnimatePresence>
            </button>
            <button
              onClick={() => fireDecision("reject")}
              disabled={acting}
              className="relative flex-[2] flex items-center rounded-none bg-[var(--text-muted)]/15 text-[var(--text)] transition-all duration-200 hover:bg-[var(--text-muted)]/30 active:scale-[0.93] disabled:opacity-30 disabled:active:scale-100 overflow-hidden"
            >
              <div className="w-1 self-stretch bg-[var(--text-muted)]/60 shrink-0" />
              <div className="flex-1 flex items-center justify-between px-3 py-1.5">
                <span className="text-xs font-bold uppercase tracking-wider">
                  &times; REJECT
                </span>
                <kbd className="text-[8px] font-normal opacity-40 border border-[var(--border)] px-1 py-px">
                  R
                </kbd>
              </div>
              <AnimatePresence>
                {flash === "reject" && (
                  <motion.div
                    key="reject-flash"
                    initial={{ opacity: 0.85 }}
                    animate={{ opacity: 0 }}
                    transition={{ duration: 0.45, ease: "easeOut" }}
                    className="absolute inset-0 bg-black pointer-events-none"
                  />
                )}
              </AnimatePresence>
            </button>
          </div>
          <div className="flex items-center gap-5 text-[var(--text)] text-[11px] font-medium tracking-wider uppercase py-1">
            <button
              onClick={onGoBack}
              disabled={acting || history.length === 0}
              className="transition-colors hover:opacity-80 active:scale-[0.93] disabled:opacity-30 disabled:cursor-default"
            >
              <kbd className="border border-[var(--text-muted)]/40 px-1.5 py-0.5 rounded-sm mr-1.5">B</kbd>
              BACK
            </button>
            <button
              onClick={onSkip}
              disabled={acting}
              className="transition-colors hover:opacity-80 active:scale-[0.93] disabled:opacity-30 disabled:cursor-default"
            >
              <kbd className="border border-[var(--text-muted)]/40 px-1.5 py-0.5 rounded-sm mr-1.5">S</kbd>
              SKIP
            </button>
            <button
              onClick={onExit}
              className="transition-colors hover:opacity-80 active:scale-[0.93]"
            >
              <kbd className="border border-[var(--text-muted)]/40 px-1.5 py-0.5 rounded-sm mr-1.5">ESC</kbd>
              EXIT
            </button>
            <div className="ml-auto flex items-center gap-5">
              <span>
                <kbd className="border border-[var(--text-muted)]/40 px-1.5 py-0.5 rounded-sm mr-1.5">F</kbd>
                STAR
              </span>
              <span>
                <kbd className="border border-[var(--text-muted)]/40 px-1.5 py-0.5 rounded-sm mr-1.5">X</kbd>
                RESCAN
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

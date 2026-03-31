"use client";

import { useState, useEffect } from "react";
import type { Upload } from "../types";
import { ChannelUploadGrid } from "./ChannelUploadGrid";

interface RejectedReviewProps {
  channel: { name: string; id: string };
  uploads: Upload[];
  topics: string[];
  onRescue: () => void;
  onNext: () => void;
  onExit: () => void;
  acting: boolean;
  remaining: number;
}

export function RejectedReview({
  channel,
  uploads,
  topics,
  onRescue,
  onNext,
  onExit,
  acting,
  remaining,
}: RejectedReviewProps) {
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "r" || e.key === "R") onRescue();
      if (e.key === "n" || e.key === "N" || e.key === " ") { e.preventDefault(); onNext(); }
      if (e.key === "Escape" || e.key === "b" || e.key === "B") onExit();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onRescue, onNext, onExit]);

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] font-mono">
      <div className="max-w-7xl mx-auto px-4 py-3 lg:px-8 lg:py-3">
        {/* Header — matches ReviewQueue style */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-5">
            <button
              onClick={onExit}
              className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors text-3xl leading-none"
            >
              &larr;
            </button>
            <button onClick={onExit} className="text-3xl font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors">
              CURATOR
            </button>
            <span className="text-lg text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1">
              <span className="text-[var(--text)] font-bold tabular-nums text-2xl">{remaining}</span>
              <span className="ml-1">left</span>
            </span>
          </div>
        </div>

        {/* Channel info */}
        <div className="mb-2">
          <div className="flex items-center gap-3 mb-0.5">
            <h2 className="text-2xl font-bold tracking-tight">{channel.name}</h2>
          </div>
          {/* YouTube topics */}
          {topics.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-[11px] text-[var(--text-muted)]/60 uppercase tracking-wider mr-1">YT topics</span>
              {topics.map((t) => (
                <span
                  key={t}
                  className={`text-[11px] px-2.5 py-1 rounded-full uppercase tracking-wider ${
                    t.toLowerCase().includes("music")
                      ? "bg-emerald-500/15 text-emerald-500"
                      : "bg-[var(--bg-alt)] text-[var(--text-muted)]"
                  }`}
                >
                  {t}
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center gap-3">
            <a
              href={`https://www.youtube.com/channel/${channel.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--text-muted)] hover:text-[var(--text)] text-xs uppercase tracking-[0.2em] transition-colors"
            >
              <svg className="w-4 h-4 inline-block mr-1.5 -mt-px" viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8zM9.5 15.6V8.4l6.3 3.6-6.3 3.6z"/></svg>
              View on YouTube &rarr;
            </a>
          </div>
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

        {/* Fixed bottom action bar — matches ReviewQueue style */}
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--bg)] border-t border-[var(--border)]">
          <div className="max-w-7xl mx-auto px-4 lg:px-8 py-3">
            <div className="flex gap-3 mb-2">
              <button
                onClick={onRescue}
                disabled={acting}
                className="relative flex-[2] flex items-center rounded-none bg-emerald-600 text-white transition-all duration-100 hover:shadow-[0_4px_20px_rgba(0,0,0,0.3)] active:scale-[0.93] active:shadow-none disabled:opacity-30"
              >
                <div className="w-1.5 self-stretch bg-emerald-400 shrink-0" />
                <div className="flex-1 flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm font-bold uppercase tracking-[0.15em]">
                    RESCUE
                  </span>
                  <kbd className="text-[9px] font-normal opacity-60 border border-current/20 px-1.5 py-0.5">
                    R
                  </kbd>
                </div>
              </button>
              <button
                onClick={onNext}
                disabled={acting}
                className="relative flex-1 flex items-center rounded-none bg-[var(--bg-alt)] text-[var(--text-muted)] transition-all duration-100 hover:text-[var(--text)] hover:bg-[var(--border)] active:scale-[0.93] disabled:opacity-30"
              >
                <div className="w-1 self-stretch bg-[var(--text-muted)] shrink-0" />
                <div className="flex-1 flex items-center justify-between px-3 py-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider">
                    NEXT &rarr;
                  </span>
                  <kbd className="text-[9px] font-normal opacity-40 border border-[var(--border)] px-1.5 py-0.5">
                    N
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
                  &larr; BACK
                  <kbd className="text-[10px] opacity-40 border border-[var(--border)] px-1.5 py-0.5 rounded">ESC</kbd>
                </span>
              </button>
              <div className="ml-auto flex items-center gap-4 text-[var(--text-muted)] text-xs tracking-wider uppercase">
                <span><kbd className="text-[10px] opacity-50 border border-[var(--border)] px-1.5 py-0.5 rounded mr-1.5">R</kbd> Rescue</span>
                <span><kbd className="text-[10px] opacity-50 border border-[var(--border)] px-1.5 py-0.5 rounded mr-1.5">N</kbd> Next</span>
                <span><kbd className="text-[10px] opacity-50 border border-[var(--border)] px-1.5 py-0.5 rounded mr-1.5">ESC</kbd> Back</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import type { CardData } from "@/lib/types";

interface NowPlayingBannerProps {
  card: CardData;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onClose: () => void;
}

export default function NowPlayingBanner({
  card,
  isPlaying,
  onTogglePlay,
  onClose,
}: NowPlayingBannerProps) {
  return (
    <div className="fixed z-[55] left-0 lg:left-[var(--sidebar-width)] right-0 bottom-0 h-10 bg-[var(--bg-alt)] border-t border-[var(--border)] flex items-center px-3 gap-3">
      {/* EQ visualizer */}
      <div className="shrink-0 flex items-end gap-[2px] h-4 w-5">
        {isPlaying ? (
          <>
            <span className="w-[2px] bg-[var(--text)] eq-bar rounded-full" style={{ animationDelay: "0ms" }} />
            <span className="w-[2px] bg-[var(--text)] eq-bar rounded-full" style={{ animationDelay: "200ms" }} />
            <span className="w-[2px] bg-[var(--text)] eq-bar rounded-full" style={{ animationDelay: "400ms" }} />
            <span className="w-[2px] bg-[var(--text)] eq-bar rounded-full" style={{ animationDelay: "100ms" }} />
            <span className="w-[2px] bg-[var(--text)] eq-bar rounded-full" style={{ animationDelay: "300ms" }} />
          </>
        ) : (
          <>
            <span className="w-[2px] h-[2px] bg-[var(--text-muted)] rounded-full" />
            <span className="w-[2px] h-[2px] bg-[var(--text-muted)] rounded-full" />
            <span className="w-[2px] h-[2px] bg-[var(--text-muted)] rounded-full" />
            <span className="w-[2px] h-[2px] bg-[var(--text-muted)] rounded-full" />
            <span className="w-[2px] h-[2px] bg-[var(--text-muted)] rounded-full" />
          </>
        )}
      </div>

      {/* Play/Pause */}
      <button
        onClick={onTogglePlay}
        className="shrink-0 font-mono text-sm text-[var(--text)] hover:text-[var(--text-muted)] transition-colors"
      >
        {isPlaying ? "■" : "▶"}
      </button>

      {/* Scrolling track info */}
      <div className="flex-1 overflow-hidden min-w-0">
        <div className="nowplaying-track inline-flex whitespace-nowrap">
          <span className="font-mono text-[11px] text-[var(--text)] uppercase tracking-wide shrink-0 pr-8">
            <span className="font-bold">{card.name}</span>
            <span className="text-[var(--text-muted)] mx-2">—</span>
            <span className="text-[var(--text-secondary)]">{card.artist}</span>
          </span>
          <span className="font-mono text-[11px] text-[var(--text)] uppercase tracking-wide shrink-0 pr-8">
            <span className="font-bold">{card.name}</span>
            <span className="text-[var(--text-muted)] mx-2">—</span>
            <span className="text-[var(--text-secondary)]">{card.artist}</span>
          </span>
        </div>
      </div>

      {/* Close */}
      <button
        onClick={onClose}
        className="shrink-0 font-mono text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
      >
        ✕
      </button>
    </div>
  );
}

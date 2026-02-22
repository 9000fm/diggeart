"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { CardData } from "@/lib/types";

interface NowPlayingBannerProps {
  card: CardData;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onClose: () => void;
  onLocate?: () => void;
  audioProgress?: number;
  audioDuration?: number;
  onSeek?: (seconds: number) => void;
  closing?: boolean;
}

function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function NowPlayingBanner({
  card,
  isPlaying,
  onTogglePlay,
  onClose,
  onLocate,
  audioProgress = 0,
  audioDuration = 0,
  onSeek,
  closing,
}: NowPlayingBannerProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const autoHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const mobileProgressBarRef = useRef<HTMLDivElement>(null);

  const progressPercent = audioDuration > 0 ? (audioProgress / audioDuration) * 100 : 0;

  // Entrance animation
  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);

  // Auto-collapse after 6s of pause
  useEffect(() => {
    if (autoHideTimer.current) clearTimeout(autoHideTimer.current);

    if (!isPlaying) {
      autoHideTimer.current = setTimeout(() => {
        setCollapsed(true);
      }, 6000);
    } else {
      setCollapsed(false);
    }

    return () => {
      if (autoHideTimer.current) clearTimeout(autoHideTimer.current);
    };
  }, [isPlaying]);

  // Expand on new track
  useEffect(() => {
    setCollapsed(false);
  }, [card.id]);

  const handleMouseEnter = useCallback(() => {
    if (collapsed) setCollapsed(false);
  }, [collapsed]);

  const handleSeekClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!onSeek || !audioDuration || !progressBarRef.current) return;
      const rect = progressBarRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const ratio = Math.max(0, Math.min(1, clickX / rect.width));
      onSeek(ratio * audioDuration);
    },
    [onSeek, audioDuration]
  );

  const handleMobileSeekClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!onSeek || !audioDuration || !mobileProgressBarRef.current) return;
      const rect = mobileProgressBarRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const ratio = Math.max(0, Math.min(1, clickX / rect.width));
      onSeek(ratio * audioDuration);
    },
    [onSeek, audioDuration]
  );

  const handleClose = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onClose();
    },
    [onClose]
  );

  const thumbUrl = card.imageSmall || card.image;

  // Source badge: clickable link for YouTube
  const sourceBadge = card.source === "youtube" && card.youtubeUrl ? (
    <a
      href={card.youtubeUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="shrink-0 font-mono text-[9px] text-[var(--accent)] uppercase tracking-wider px-1.5 py-0.5 border border-[var(--accent)]/30 rounded hover:text-[var(--text)] hover:border-[var(--text-secondary)] transition-colors"
    >
      YT ↗
    </a>
  ) : (
    <span className="shrink-0 font-mono text-[9px] text-[var(--text-muted)] uppercase tracking-wider px-1.5 py-0.5 border border-[var(--border)] rounded">
      YT
    </span>
  );

  // EQ bars — mini visualizer next to track info
  const eqBars = (
    <div className="flex items-end gap-[2px] h-3.5">
      <span className="w-[2px] bg-[var(--text)] eq-bar-1 rounded-full" />
      <span className="w-[2px] bg-[var(--text)] eq-bar-2 rounded-full" />
      <span className="w-[2px] bg-[var(--text)] eq-bar-3 rounded-full" />
      <span className="w-[2px] bg-[var(--text)] eq-bar-4 rounded-full" />
      <span className="w-[2px] bg-[var(--text)] eq-bar-5 rounded-full" />
    </div>
  );

  // Locate button — crosshair icon
  const locateButton = onLocate ? (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onLocate();
      }}
      className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)] transition-colors"
      title="Go to playing card"
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v4M12 18v4M2 12h4M18 12h4" strokeLinecap="round" />
      </svg>
    </button>
  ) : null;

  // Seek bar with visible thumb (shared between layouts)
  const seekBar = (ref: React.RefObject<HTMLDivElement | null>, onClick: (e: React.MouseEvent<HTMLDivElement>) => void) => (
    <div className="flex-1 py-2">
      <div
        ref={ref}
        className="relative h-3 bg-[var(--border)] rounded-full cursor-pointer"
        onClick={onClick}
      >
        <div
          className="h-full bg-[var(--text)] rounded-full transition-[width] duration-200"
          style={{ width: `${progressPercent}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-[var(--bg)] border-2 border-[var(--text)] shadow-md transition-[left] duration-200"
          style={{ left: `${progressPercent}%` }}
        />
      </div>
    </div>
  );

  return (
    <div
      className={`player-banner fixed left-0 right-0 lg:left-[var(--sidebar-width)] bg-[var(--bg-alt)]/85 backdrop-blur-2xl backdrop-saturate-150 border-t border-[var(--border)]/50 ${
        closing ? "player-exit" : mounted ? "player-enter" : "translate-y-full opacity-0"
      }`}
      style={{
        bottom: 0,
        height: collapsed ? "3px" : "var(--player-height)",
      }}
      onMouseEnter={handleMouseEnter}
    >
      {/* Collapsed state — thin accent line */}
      {collapsed && (
        <div className="h-full w-full bg-[var(--accent)] cursor-pointer" />
      )}

      {/* ===== DESKTOP layout (sm+): single row, 96px ===== */}
      {!collapsed && (
        <div className="h-full hidden sm:flex items-center px-4 py-2.5 gap-3">
          {/* Album art thumbnail */}
          {thumbUrl && (
            <div className="shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-[var(--bg)] shadow-md">
              <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
            </div>
          )}

          {/* Track info + EQ */}
          <div className="shrink-0 min-w-0 max-w-[300px]">
            <div className="flex items-center gap-2">
              <p className="font-mono text-sm text-[var(--text)] uppercase truncate leading-tight font-bold">
                {card.name}
              </p>
              {isPlaying && eqBars}
            </div>
            <p className="font-mono text-xs text-[var(--text-secondary)] uppercase truncate leading-tight">
              {card.artist}
            </p>
          </div>

          {/* Play/Pause */}
          <button
            onClick={onTogglePlay}
            className="shrink-0 w-11 h-11 rounded-full bg-[var(--text)] text-[var(--bg)] flex items-center justify-center hover:opacity-80 transition-opacity"
          >
            <span className="font-mono text-sm leading-none" style={{ marginLeft: isPlaying ? 0 : "2px" }}>
              {isPlaying ? "■" : "▶"}
            </span>
          </button>

          {/* Progress section */}
          {audioDuration > 0 ? (
            <div className="flex flex-1 items-center gap-2 min-w-0">
              <span className="shrink-0 font-mono text-[10px] text-[var(--text-muted)] tabular-nums w-8 text-right">
                {formatTime(audioProgress)}
              </span>
              {seekBar(progressBarRef, handleSeekClick)}
              <span className="shrink-0 font-mono text-[10px] text-[var(--text-muted)] tabular-nums w-8">
                {formatTime(audioDuration)}
              </span>
            </div>
          ) : card.source === "youtube" ? (
            <div className="flex flex-1 items-center gap-2 min-w-0">
              <span className="shrink-0 font-mono text-[10px] text-[var(--text-muted)] tabular-nums">
                {formatTime(audioProgress)}
              </span>
              <div className="flex-1 h-1 bg-[var(--border)] rounded-full overflow-hidden">
                <div className="h-full w-1/3 bg-[var(--text)]/30 rounded-full animate-pulse" />
              </div>
            </div>
          ) : (
            <div className="flex flex-1" />
          )}

          {/* Source badge + locate + close */}
          <div className="flex items-center gap-3">
            {sourceBadge}
            {locateButton}
            <button
              onClick={handleClose}
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full font-mono text-xs text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)] transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ===== MOBILE layout (below sm): 2-row, 120px ===== */}
      {!collapsed && (
        <div className="h-full flex sm:hidden flex-col px-3 py-2 gap-1.5">
          {/* Row 1: Art + Info + YT + Locate + Play + Close */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {thumbUrl && (
              <div className="shrink-0 w-[72px] h-[72px] rounded-lg overflow-hidden bg-[var(--bg)] shadow-md">
                <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-mono text-sm text-[var(--text)] uppercase truncate leading-tight font-bold">
                {card.name}
              </p>
              <p className="font-mono text-[11px] text-[var(--text-secondary)] uppercase truncate leading-tight">
                {card.artist}
              </p>
              {isPlaying && <div className="mt-1">{eqBars}</div>}
            </div>
            {sourceBadge}
            {locateButton}
            <button
              onClick={onTogglePlay}
              className="shrink-0 w-10 h-10 rounded-full bg-[var(--text)] text-[var(--bg)] flex items-center justify-center hover:opacity-80 transition-opacity"
            >
              <span className="font-mono text-[11px] leading-none" style={{ marginLeft: isPlaying ? 0 : "1px" }}>
                {isPlaying ? "■" : "▶"}
              </span>
            </button>
            <button
              onClick={handleClose}
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full font-mono text-[10px] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)] transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Row 2: Seek bar with timestamps */}
          <div className="flex items-center gap-2">
            <span className="shrink-0 font-mono text-[9px] text-[var(--text-muted)] tabular-nums w-7 text-right">
              {formatTime(audioProgress)}
            </span>
            {audioDuration > 0 ? (
              seekBar(mobileProgressBarRef, handleMobileSeekClick)
            ) : (
              <div className="flex-1 h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
                <div className="h-full w-1/3 bg-[var(--text)]/30 rounded-full animate-pulse" />
              </div>
            )}
            <span className="shrink-0 font-mono text-[9px] text-[var(--text-muted)] tabular-nums w-7">
              {audioDuration > 0 ? formatTime(audioDuration) : "--:--"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

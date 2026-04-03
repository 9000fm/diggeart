"use client";

import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import Tooltip from "./Tooltip";
import type { CardData } from "@/lib/types";

const BURST_COLORS = ["#f87171", "#fb923c", "#f472b6", "#e879f9", "#fbbf24", "#34d399"];

function formatViewCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(0)}K`;
  return String(count);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

interface NowPlayingBannerProps {
  card: CardData;
  isPlaying: boolean;
  isUnavailable?: boolean;
  onTogglePlay: () => void;
  onClose: () => void;
  onLocate?: () => void;
  onPrevTrack?: () => void;
  onNextTrack?: () => void;
  hasPrev?: boolean;
  audioProgress?: number;
  audioDuration?: number;
  onSeek?: (seconds: number) => void;
  autoPlay?: boolean;
  onToggleAutoPlay?: () => void;
  volume?: number;
  isMuted?: boolean;
  onVolumeChange?: (volume: number) => void;
  onVolumeCommit?: (volume: number) => void;
  onToggleMute?: () => void;
  isLiked?: boolean;
  onToggleLike?: () => void;
  isAuthenticated?: boolean;
  showQueue?: boolean;
  onToggleQueue?: () => void;
  undoRestoredId?: string | null;
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
  isUnavailable = false,
  onTogglePlay,
  onClose,
  onLocate,
  onPrevTrack,
  onNextTrack,
  hasPrev = false,
  audioProgress = 0,
  audioDuration = 0,
  onSeek,
  autoPlay = true,
  onToggleAutoPlay,
  volume = 80,
  isMuted = false,
  onVolumeChange,
  onVolumeCommit,
  onToggleMute,
  isLiked = false,
  onToggleLike,
  isAuthenticated = true,
  showQueue = false,
  onToggleQueue,
  undoRestoredId = null,
}: NowPlayingBannerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const [dragPercent, setDragPercent] = useState<number | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const mobileProgressBarRef = useRef<HTMLDivElement>(null);
  const tabletProgressBarRef = useRef<HTMLDivElement>(null);
  const miniBarRef = useRef<HTMLDivElement>(null);

  // Hover preview tooltip
  const [hoverPercent, setHoverPercent] = useState<number | null>(null);

  // Delayed close button reveal
  const [showClose, setShowClose] = useState(false);
  useEffect(() => {
    setShowClose(false);
    const timer = setTimeout(() => setShowClose(true), 1200);
    return () => clearTimeout(timer);
  }, [card.id]);

  // EQ collapse
  const [eqActive, setEqActive] = useState(isPlaying);
  const eqBarRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const prevPlayingRef = useRef(isPlaying);

  // Mobile volume popup
  const [showVolumeFader, setShowVolumeFader] = useState(false);
  const volumeFaderRef = useRef<HTMLDivElement>(null);
  const volumeIconRef = useRef<HTMLButtonElement>(null);
  const mobileVolumeFaderRef = useRef<HTMLDivElement>(null);
  const mobileVolumeIconRef = useRef<HTMLButtonElement>(null);
  const volumeIdleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const volTrackRef = useRef<HTMLDivElement>(null);
  const volTrackTabletRef = useRef<HTMLDivElement>(null);
  const volFaderRef = useRef<HTMLDivElement>(null);
  const mobileVolFaderRef = useRef<HTMLDivElement>(null);
  const miniVolTrackRef = useRef<HTMLDivElement>(null);
  const isDraggingVolRef = useRef(false);
  const [isDraggingVol, setIsDraggingVol] = useState(false);
  const [dragVolume, setDragVolume] = useState(volume);
  const dragVolumeRef = useRef(volume);

  // Sync drag volume with prop when not dragging
  useEffect(() => {
    if (!isDraggingVolRef.current) {
      setDragVolume(volume);
      dragVolumeRef.current = volume;
    }
  }, [volume]);

  // Helper: update drag volume (state for visual + ref for commit)
  const updateDragVolume = useCallback((v: number) => {
    setDragVolume(v);
    dragVolumeRef.current = v;
  }, []);

  // Mobile minimize state
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const expandedHeightRef = useRef(168);

  // Info popover
  const [showInfo, setShowInfo] = useState(false);
  const infoRef = useRef<HTMLDivElement>(null);
  const infoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const infoButtonRef = useRef<HTMLButtonElement>(null);
  const [infoAnchor, setInfoAnchor] = useState<{ left: number; top: number } | null>(null);

  // (likeHovered removed — heart uses scale+color shift only)

  const startInfoDismissTimer = useCallback(() => {
    if (infoTimerRef.current) clearTimeout(infoTimerRef.current);
    infoTimerRef.current = setTimeout(() => setShowInfo(false), 8000);
  }, []);

  const cancelInfoDismissTimer = useCallback(() => {
    if (infoTimerRef.current) { clearTimeout(infoTimerRef.current); infoTimerRef.current = null; }
  }, []);

  const hasDuration = audioDuration > 0;

  const progressPercent =
    dragPercent !== null
      ? dragPercent
      : hasDuration
        ? (audioProgress / audioDuration) * 100
        : 0;

  // EQ collapse: imperative 3-frame sequence — scaleY-based (GPU-accelerated)
  useEffect(() => {
    if (prevPlayingRef.current && !isPlaying) {
      const bars = eqBarRefs.current.filter(Boolean) as HTMLSpanElement[];
      // Frame 1: pause animation at current position
      bars.forEach((bar) => { bar.style.animationPlayState = "paused"; });

      requestAnimationFrame(() => {
        // Frame 2: read current scaleY from computed transform matrix, freeze it
        bars.forEach((bar, i) => {
          const cs = getComputedStyle(bar).transform;
          let d = 0.15; // fallback
          if (cs && cs !== "none") {
            const match = cs.match(/matrix\(([^)]+)\)/);
            if (match) {
              const vals = match[1].split(",").map(Number);
              d = vals[3] || d; // matrix(a,b,c,d,tx,ty) — d is scaleY
            }
          }
          bar.style.animation = "none";
          bar.style.transform = `scaleY(${d})`;
          bar.style.transition = `transform 0.35s ease-out ${i * 60}ms`;
        });

        requestAnimationFrame(() => {
          // Frame 3: collapse to 0 — transition kicks in from frozen scaleY
          bars.forEach((bar) => { bar.style.transform = "scaleY(0)"; });
        });
      });

      setEqActive(false);
    } else if (isPlaying) {
      // Clear all inline overrides, let CSS animation take over
      const bars = eqBarRefs.current.filter(Boolean) as HTMLSpanElement[];
      bars.forEach((bar) => {
        bar.style.animation = "";
        bar.style.animationPlayState = "";
        bar.style.transform = "";
        bar.style.transition = "";
      });
      setEqActive(true);
    }
    prevPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Dismiss volume fader on outside click
  useEffect(() => {
    if (!showVolumeFader) return;
    const handler = (e: PointerEvent) => {
      const t = e.target as Node;
      const insideFader = volumeFaderRef.current?.contains(t) || mobileVolumeFaderRef.current?.contains(t);
      const insideIcon = volumeIconRef.current?.contains(t) || mobileVolumeIconRef.current?.contains(t);
      if (!insideFader && !insideIcon) {
        setShowVolumeFader(false);
      }
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [showVolumeFader]);

  // Auto-dismiss volume fader after 3s idle
  useEffect(() => {
    if (!showVolumeFader) return;
    if (volumeIdleTimer.current) clearTimeout(volumeIdleTimer.current);
    volumeIdleTimer.current = setTimeout(() => setShowVolumeFader(false), 3000);
    return () => { if (volumeIdleTimer.current) clearTimeout(volumeIdleTimer.current); };
  }, [showVolumeFader, volume, isMuted]);

  // Dismiss info popover on outside click
  useEffect(() => {
    if (!showInfo) return;
    const handler = (e: PointerEvent) => {
      // Check if click is on any info toggle button (there are multiple across layouts)
      if ((e.target as HTMLElement).closest?.("[data-info-toggle]")) return;
      if (infoRef.current && !infoRef.current.contains(e.target as Node)) setShowInfo(false);
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [showInfo]);

  // Close info when track changes + clear timer
  useEffect(() => {
    setShowInfo(false);
    cancelInfoDismissTimer();
  }, [card.id, cancelInfoDismissTimer]);

  // Mobile viewport detection — reset minimize on desktop resize
  useEffect(() => {
    const update = () => {
      const mobile = window.innerWidth < 1152;
      setIsMobile(mobile);
      if (!mobile) setIsMinimized(false);
      // Read CSS-defined expanded height (temporarily remove inline override)
      const el = document.documentElement;
      const inlineVal = el.style.getPropertyValue('--player-height');
      if (inlineVal) el.style.removeProperty('--player-height');
      const val = parseInt(getComputedStyle(el).getPropertyValue('--player-height'), 10);
      if (val > 0) expandedHeightRef.current = val;
      if (inlineVal) el.style.setProperty('--player-height', inlineVal);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Sync --player-height CSS variable for page padding
  useEffect(() => {
    if (isMobile && isMinimized) {
      document.documentElement.style.setProperty('--player-height', '44px');
    } else {
      document.documentElement.style.removeProperty('--player-height');
    }
    return () => { document.documentElement.style.removeProperty('--player-height'); };
  }, [isMinimized, isMobile]);

  // --- Unified pointer seek handler ---
  const calcRatio = useCallback(
    (clientX: number, barEl: HTMLDivElement) => {
      const rect = barEl.getBoundingClientRect();
      return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    },
    []
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, barRef: React.RefObject<HTMLDivElement | null>) => {
      if (!onSeek || !barRef.current || !hasDuration) return;
      e.preventDefault();
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
      isDraggingRef.current = true;
      setIsDragging(true);
      const ratio = calcRatio(e.clientX, barRef.current);
      setDragPercent(ratio * 100);
    },
    [onSeek, hasDuration, calcRatio]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, barRef: React.RefObject<HTMLDivElement | null>) => {
      if (!isDraggingRef.current || !barRef.current) return;
      const ratio = calcRatio(e.clientX, barRef.current);
      setDragPercent(ratio * 100);
    },
    [calcRatio]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, barRef: React.RefObject<HTMLDivElement | null>) => {
      if (!isDraggingRef.current || !onSeek || !barRef.current) return;
      const ratio = calcRatio(e.clientX, barRef.current);
      onSeek(ratio * audioDuration);
      isDraggingRef.current = false;
      setIsDragging(false);
      setDragPercent(null);
    },
    [onSeek, audioDuration, calcRatio]
  );

  const thumbUrl = card.imageSmall || card.image;

  // EQ bars — always rendered; collapse handled imperatively via refs
  const eqBars = (
    <div className="flex flex-col items-center shrink-0">
      <div className="flex items-end gap-[2px] h-3.5">
        {[1, 2, 3, 4, 5].map((n, i) => (
          <span
            key={n}
            ref={(el) => { eqBarRefs.current[i] = el; }}
            className={`eq-bar-base w-[2px] bg-[var(--text)] rounded-full ${eqActive ? `eq-bar-${n}` : "eq-bar-idle"}`}
          />
        ))}
      </div>
      <div className="flex items-start gap-[2px] h-2 opacity-25 overflow-hidden">
        {[1, 2, 3, 4, 5].map((n, i) => (
          <span key={n} className={`eq-bar-base w-[2px] bg-[var(--text)] rounded-full ${eqActive ? `eq-bar-${n}` : "eq-bar-idle"}`} style={{ transformOrigin: "top" }} />
        ))}
      </div>
    </div>
  );

  // Like/Heart button
  const [likeNudge, setLikeNudge] = useState(false);
  const [tipLocked, setTipLocked] = useState(false);
  const [likeBurst, setLikeBurst] = useState(false);
  const [likeFillUp, setLikeFillUp] = useState(false);
  const prevIsLikedRef = useRef(isLiked);
  const likeBtnRef = useRef<HTMLButtonElement>(null);

  const likeFillTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useLayoutEffect(() => {
    const isUndo = undoRestoredId === card.id;
    if (isLiked && !prevIsLikedRef.current && isUndo) {
      setLikeFillUp(true);
      if (likeFillTimerRef.current) clearTimeout(likeFillTimerRef.current);
      likeFillTimerRef.current = setTimeout(() => setLikeFillUp(false), 2500);
    } else if (!isLiked && likeFillUp) {
      setLikeFillUp(false);
      if (likeFillTimerRef.current) clearTimeout(likeFillTimerRef.current);
    }
    prevIsLikedRef.current = isLiked;
  }, [isLiked, undoRestoredId, card.id, likeFillUp]);
  const likeButton = (size: "sm" | "md" = "md") => onToggleLike ? (
    <Tooltip label={isAuthenticated ? (isLiked ? "Saved!" : "Save") : "Log in to save"} position="top">
      <motion.button
        ref={likeBtnRef}
        onClick={(e) => {
          e.stopPropagation();
          if (isAuthenticated) {
            if (!isLiked) {
              setLikeBurst(true);
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
              const x = (rect.left + rect.width / 2) / window.innerWidth;
              const y = (rect.top + rect.height / 2) / window.innerHeight;
              confetti({
                particleCount: 30,
                spread: 35,
                angle: 90,
                startVelocity: 12,
                gravity: 1.0,
                scalar: 0.45,
                ticks: 40,
                colors: BURST_COLORS,
                origin: { x, y },
                disableForReducedMotion: true,
              });
            }
            onToggleLike();
          } else {
            setLikeNudge(true);
            setTipLocked(true);
            setTimeout(() => { setLikeNudge(false); setTipLocked(false); }, 1500);
          }
        }}
        onMouseLeave={() => { setTipLocked(false); }}
        animate={likeBurst ? { scale: [1, 1.4, 1] } : {}}
        transition={{ duration: 0.35, ease: "easeOut" }}
        onAnimationComplete={() => setLikeBurst(false)}
        className={`shrink-0 flex items-center justify-center rounded-full transition-colors duration-200 ease-out ${
          size === "sm" ? "w-6 h-6" : "w-8 h-8 2xl:w-10 2xl:h-10"
        } ${isLiked ? "text-[var(--text)]" : "text-[var(--text-muted)] hover:text-[var(--text)]"} ${!isAuthenticated ? "opacity-50 cursor-default" : ""}`}
        style={{ transition: "color 0.2s ease-out" }}
      >
        <svg
          className={size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"}
          viewBox="0 0 24 24"
        >
          <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" fill={isLiked && !likeFillUp ? "currentColor" : "none"} stroke="currentColor" strokeWidth={isLiked && !likeFillUp ? 0 : 2} strokeLinecap="round" strokeLinejoin="round" />
          {likeFillUp && (
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" fill="currentColor" className="animate-[heartFillUp_2s_cubic-bezier(0.22,1,0.36,1)_forwards]" />
          )}
        </svg>
      </motion.button>
    </Tooltip>
  ) : null;

  // Locate button — also triggers on custom "locate-triggered" event (from keyboard shortcut)
  const [locateSpin, setLocateSpin] = useState(false);
  useEffect(() => {
    const handler = () => { setLocateSpin(true); };
    document.addEventListener("locate-triggered", handler);
    return () => document.removeEventListener("locate-triggered", handler);
  }, []);
  const locateButton = (size: "sm" | "md" = "md") => onLocate ? (
    <Tooltip label="Locate (l)" position="top" hideOnClick>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setLocateSpin(true);
          onLocate();
        }}
        className={`locate-btn shrink-0 flex items-center justify-center hover:text-[var(--text)] transition-all duration-200 ease-out active:scale-95 ${
          locateSpin ? "text-[var(--text)]" : "text-[var(--text-muted)]"
        } ${size === "sm" ? "w-7 h-7" : "w-7 h-7"}`}
      >
        <svg
          className={`${size === "sm" ? "w-4 h-4" : "w-4 h-4"} ${locateSpin ? "animate-[locate-spin_0.5s_ease-in-out]" : ""}`}
          onAnimationEnd={() => setLocateSpin(false)}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round"
        >
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
          <line x1="12" y1="1" x2="12" y2="7" />
          <line x1="12" y1="17" x2="12" y2="23" />
          <line x1="1" y1="12" x2="7" y2="12" />
          <line x1="17" y1="12" x2="23" y2="12" />
        </svg>
      </button>
    </Tooltip>
  ) : null;

  // Fullscreen toggle (desktop only)
  const [isFullscreen, setIsFullscreen] = useState(false);
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);
  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  }, []);
  const fullscreenButton = (
    <Tooltip label="Fullscreen (f)" position="top" hideOnClick>
      <button
        onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
        className="shrink-0 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] transition-colors w-8 h-8 2xl:w-10 2xl:h-10 active:scale-95"
      >
        {isFullscreen ? (
          <svg className="w-4 h-4 2xl:w-5 2xl:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 3v3a2 2 0 0 1-2 2H3" />
            <path d="M16 3v3a2 2 0 0 0 2 2h3" />
            <path d="M8 21v-3a2 2 0 0 0-2-2H3" />
            <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
          </svg>
        ) : (
          <svg className="w-4 h-4 2xl:w-5 2xl:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 8V5a2 2 0 0 1 2-2h3" />
            <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
            <path d="M3 16v3a2 2 0 0 0 2 2h3" />
            <path d="M21 16v3a2 2 0 0 1-2 2h-3" />
          </svg>
        )}
      </button>
    </Tooltip>
  );

  const queueButton = onToggleQueue ? (
    <Tooltip label="Queue" position="top" hideOnClick>
      <button
        onClick={(e) => { e.stopPropagation(); onToggleQueue(); }}
        className={`shrink-0 flex items-center justify-center transition-colors w-8 h-8 2xl:w-10 2xl:h-10 active:scale-95 ${
          showQueue ? "text-[var(--text)]" : "text-[var(--text-muted)] hover:text-[var(--text)]"
        }`}
      >
        <svg className="w-4 h-4 2xl:w-5 2xl:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="18" y2="12" />
          <line x1="3" y1="18" x2="15" y2="18" />
        </svg>
      </button>
    </Tooltip>
  ) : null;

  // Info button (reusable like likeButton)
  const infoButton = (size: "sm" | "md" = "md") => isAuthenticated ? (
    <button
      ref={infoButtonRef}
      data-info-toggle
      onClick={(e) => {
        e.stopPropagation();
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setInfoAnchor({ left: rect.left + rect.width / 2, top: rect.top });
        setShowInfo((v) => {
          if (!v) startInfoDismissTimer();
          else cancelInfoDismissTimer();
          return !v;
        });
      }}
      className={`shrink-0 flex items-center justify-center rounded-full transition-all duration-200 ${
        size === "sm" ? "w-6 h-6" : "w-8 h-8 2xl:w-10 2xl:h-10"
      } ${showInfo ? "text-[var(--text)]" : "text-[var(--text-muted)] hover:text-[var(--text)]"}`}
    >
      <svg className={size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <circle cx="12" cy="8" r="0.5" fill="currentColor" />
      </svg>
    </button>
  ) : null;

  // Shuffle button
  const autoPlayButton = onToggleAutoPlay ? (
    <Tooltip label={autoPlay ? "Shuffle on (s)" : "Shuffle off (s)"} position="top">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleAutoPlay();
        }}
        className={`relative shrink-0 w-7 h-7 flex items-center justify-center transition-all duration-200 ease-out active:scale-95 ${
          autoPlay
            ? "text-[var(--text)]"
            : "text-[var(--text-muted)] hover:text-[var(--text)]"
        }`}
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill={autoPlay ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 3h5v5" />
          <path d="M4 20L21 3" />
          <path d="M21 16v5h-5" />
          <path d="M15 15l6 6" />
          <path d="M4 4l5 5" />
        </svg>
        <span className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-current transition-opacity duration-200 ${autoPlay ? "opacity-100" : "opacity-0"}`} />
      </button>
    </Tooltip>
  ) : null;

  // Volume slider (desktop/tablet)
  const volumeControl = (trackRef: React.RefObject<HTMLDivElement | null> = volTrackRef) => {
    const effectiveVolume = isMuted ? 0 : dragVolume;
    const speakerIcon = (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        {isMuted || effectiveVolume === 0 ? (
          <>
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
          </>
        ) : effectiveVolume < 50 ? (
          <path d="M15.54 8.46a5 5 0 010 7.07" />
        ) : (
          <>
            <path d="M15.54 8.46a5 5 0 010 7.07" />
            <path d="M19.07 4.93a10 10 0 010 14.14" />
          </>
        )}
      </svg>
    );

    return (
      <div className="group/vol relative flex items-center gap-1.5">
        {/* Speaker button: mute toggle at ≥1111px, popup toggle below */}
        <Tooltip label={isMuted ? "Unmute (m)" : "Volume (m)"}>
          <button
            ref={volumeIconRef}
            onClick={(e) => {
              e.stopPropagation();
              if (window.innerWidth >= 768) {
                onToggleMute?.();
              } else {
                updateDragVolume(volume);
                setShowVolumeFader((prev) => !prev);
              }
            }}
            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-[var(--text-muted)] hover:text-[var(--text)] transition-all duration-200 ease-out active:scale-95"
          >
            {speakerIcon}
          </button>
        </Tooltip>
        {/* Horizontal slider — wide screens only */}
        <div
          ref={trackRef}
          className="hidden md:flex items-center w-20 h-7 cursor-pointer touch-none"
          onPointerDown={(e) => {
            if (!trackRef.current) return;
            e.preventDefault();
            (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
            isDraggingVolRef.current = true;
            setIsDraggingVol(true);
            const rect = trackRef.current.getBoundingClientRect();
            const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            const newVol = Math.round(ratio * 100);
            updateDragVolume(newVol);
            onVolumeChange?.(newVol);
          }}
          onPointerMove={(e) => {
            if (!isDraggingVolRef.current || !trackRef.current) return;
            const rect = trackRef.current.getBoundingClientRect();
            const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            const newVol = Math.round(ratio * 100);
            updateDragVolume(newVol);
            onVolumeChange?.(newVol);
          }}
          onPointerUp={() => { isDraggingVolRef.current = false; setIsDraggingVol(false); onVolumeCommit?.(dragVolumeRef.current); }}
        >
          <div className="relative w-full h-1 bg-[color-mix(in_srgb,var(--text-muted)_50%,var(--border))] rounded-full">
            <div className="absolute left-0 top-0 h-full bg-[var(--text)] rounded-full" style={{ width: `${effectiveVolume}%`, transition: isDraggingVol ? 'none' : 'width 150ms cubic-bezier(0.4,0,0.2,1)' }} />
            <div className="absolute w-3.5 h-3.5 rounded-full bg-[var(--bg)] border-2 border-[var(--text)] shadow-sm pointer-events-none" style={{ left: `${effectiveVolume}%`, top: '50%', transform: 'translate(-50%, -50%)', transition: isDraggingVol ? 'none' : 'left 150ms cubic-bezier(0.4,0,0.2,1)' }} />
          </div>
        </div>
        {/* Vertical fader popup — narrow screens */}
        {showVolumeFader && (
          <div
            ref={volumeFaderRef}
            className="absolute left-1/2 -translate-x-1/2 px-3 py-3 bg-[var(--bg-alt)]/95 backdrop-blur-xl border border-[var(--border)] rounded-xl shadow-2xl z-50 md:hidden"
            style={{ bottom: "calc(100% + 8px)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              ref={volFaderRef}
              className="relative w-5 h-24 cursor-pointer touch-none mx-auto"
              onPointerDown={(e) => {
                if (!volFaderRef.current) return;
                e.preventDefault();
                (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
                isDraggingVolRef.current = true;
                setIsDraggingVol(true);
                const rect = volFaderRef.current.getBoundingClientRect();
                const ratio = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));
                const newVol = Math.round(ratio * 100);
                updateDragVolume(newVol);
                onVolumeChange?.(newVol);
                if (volumeIdleTimer.current) clearTimeout(volumeIdleTimer.current);
                volumeIdleTimer.current = setTimeout(() => setShowVolumeFader(false), 3000);
              }}
              onPointerMove={(e) => {
                if (!isDraggingVolRef.current || !volFaderRef.current) return;
                const rect = volFaderRef.current.getBoundingClientRect();
                const ratio = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));
                const newVol = Math.round(ratio * 100);
                updateDragVolume(newVol);
                onVolumeChange?.(newVol);
              }}
              onPointerUp={() => { isDraggingVolRef.current = false; setIsDraggingVol(false); onVolumeCommit?.(dragVolumeRef.current); }}
            >
              {/* Visual track (thin) centered inside the wide transparent hit area */}
              <div className="absolute left-1/2 -translate-x-1/2 w-1 h-full bg-[color-mix(in_srgb,var(--text-muted)_50%,var(--border))] rounded-full">
                <div className="absolute bottom-0 left-0 w-full bg-[var(--text)] rounded-full" style={{ height: `${effectiveVolume}%`, transition: isDraggingVol ? 'none' : 'height 150ms cubic-bezier(0.4,0,0.2,1)' }} />
              </div>
              <div className="absolute w-3.5 h-3.5 rounded-full bg-[var(--bg)] border-2 border-[var(--text)] shadow-sm pointer-events-none" style={{ bottom: `${effectiveVolume}%`, left: '50%', transform: 'translate(-50%, 50%)', transition: isDraggingVol ? 'none' : 'bottom 150ms cubic-bezier(0.4,0,0.2,1)' }} />
            </div>
          </div>
        )}
      </div>
    );
  };

  // Mobile volume icon + vertical fader popup
  const mobileVolumePopup = () => {
    const effectiveVolume = isMuted ? 0 : dragVolume;
    return (
      <div className="relative shrink-0">
        <button
          ref={mobileVolumeIconRef}
          onClick={(e) => {
            e.stopPropagation();
            updateDragVolume(volume);
            setShowVolumeFader((prev) => !prev);
          }}
          className="w-7 h-7 flex items-center justify-center rounded-full text-[var(--text-muted)] hover:text-[var(--text)] transition-all duration-200 ease-out active:scale-95"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            {isMuted || effectiveVolume === 0 ? (
              <>
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </>
            ) : effectiveVolume < 50 ? (
              <path d="M15.54 8.46a5 5 0 010 7.07" />
            ) : (
              <>
                <path d="M15.54 8.46a5 5 0 010 7.07" />
                <path d="M19.07 4.93a10 10 0 010 14.14" />
              </>
            )}
          </svg>
        </button>

        {/* Vertical fader popup */}
        {showVolumeFader && (
          <div
            ref={mobileVolumeFaderRef}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-3 bg-[var(--bg-alt)]/95 backdrop-blur-xl border border-[var(--border)] rounded-xl shadow-2xl z-[60] touch-none"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <div
              ref={mobileVolFaderRef}
              className="relative w-5 h-28 cursor-pointer touch-none mx-auto"
              onPointerDown={(e) => {
                if (!mobileVolFaderRef.current) return;
                e.preventDefault();
                (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
                isDraggingVolRef.current = true;
                setIsDraggingVol(true);
                const rect = mobileVolFaderRef.current.getBoundingClientRect();
                const ratio = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));
                const newVol = Math.round(ratio * 100);
                updateDragVolume(newVol);
                onVolumeChange?.(newVol);
                if (volumeIdleTimer.current) clearTimeout(volumeIdleTimer.current);
                volumeIdleTimer.current = setTimeout(() => setShowVolumeFader(false), 3000);
              }}
              onPointerMove={(e) => {
                if (!isDraggingVolRef.current || !mobileVolFaderRef.current) return;
                const rect = mobileVolFaderRef.current.getBoundingClientRect();
                const ratio = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));
                const newVol = Math.round(ratio * 100);
                updateDragVolume(newVol);
                onVolumeChange?.(newVol);
              }}
              onPointerUp={() => { isDraggingVolRef.current = false; setIsDraggingVol(false); onVolumeCommit?.(dragVolumeRef.current); }}
            >
              {/* Thin visual track centered inside wider hit area */}
              <div className="absolute left-1/2 -translate-x-1/2 w-1 h-full bg-[color-mix(in_srgb,var(--text-muted)_50%,var(--border))] rounded-full">
                <div className="absolute bottom-0 left-0 w-full bg-[var(--text)] rounded-full" style={{ height: `${effectiveVolume}%`, transition: isDraggingVol ? 'none' : 'height 150ms cubic-bezier(0.4,0,0.2,1)' }} />
              </div>
              <div className="absolute w-3.5 h-3.5 rounded-full bg-[var(--bg)] border-2 border-[var(--text)] shadow-sm pointer-events-none" style={{ bottom: `${effectiveVolume}%`, left: '50%', transform: 'translate(-50%, 50%)', transition: isDraggingVol ? 'none' : 'bottom 150ms cubic-bezier(0.4,0,0.2,1)' }} />
            </div>
          </div>
        )}
      </div>
    );
  };

  // Seek bar
  const seekBar = (barRef: React.RefObject<HTMLDivElement | null>) => (
    <div
      className="group/seek flex-1 py-3 px-2 cursor-pointer touch-none"
      onMouseMove={(e) => {
        if (!barRef.current || !hasDuration) return;
        const rect = barRef.current.getBoundingClientRect();
        setHoverPercent(Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)));
      }}
      onMouseLeave={() => setHoverPercent(null)}
      onPointerDown={(e) => handlePointerDown(e, barRef)}
      onPointerMove={(e) => handlePointerMove(e, barRef)}
      onPointerUp={(e) => handlePointerUp(e, barRef)}
    >
      <div
        ref={barRef}
        className="relative h-1 bg-[color-mix(in_srgb,var(--text-muted)_50%,var(--border))] rounded-full"
      >
        {/* Hover preview fill */}
        {hoverPercent !== null && !isDragging && (
          <div
            className="absolute inset-y-0 left-0 bg-[var(--text)] opacity-45 rounded-full pointer-events-none"
            style={{ width: `${hoverPercent}%` }}
          />
        )}
        <div
          className="h-full bg-[var(--text)] rounded-full pointer-events-none"
          style={{
            width: `${progressPercent}%`,
            transition: isDragging ? "none" : "width 200ms linear",
            willChange: "width",
          }}
        />
        <div
          className="seek-thumb absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full bg-[var(--bg)] border-2 border-[var(--text)] shadow-md pointer-events-none"
          style={{
            left: `${progressPercent}%`,
            width: 14,
            height: 14,
            transition: isDragging ? "none" : "left 200ms linear",
            willChange: "left",
          }}
        />
        {/* Hover timestamp tooltip */}
        {hoverPercent !== null && hasDuration && !isDragging && (
          <div
            className="absolute -top-7 -translate-x-1/2 pointer-events-none px-1.5 py-0.5 bg-[var(--text)] text-[var(--bg)] rounded font-mono text-[10px] tabular-nums whitespace-nowrap z-50"
            style={{ left: `${hoverPercent}%` }}
          >
            {formatTime((hoverPercent / 100) * audioDuration)}
          </div>
        )}
      </div>
    </div>
  );

  // Time labels — desktop
  const elapsedLabel = (
    <span className="shrink-0 font-mono text-xs text-[var(--text-muted)] tabular-nums w-9 text-right">
      {formatTime(audioProgress)}
    </span>
  );
  const remainingLabel = (
    <span className="shrink-0 font-mono text-xs text-[var(--text-muted)] tabular-nums w-9">
      {hasDuration ? `-${formatTime(Math.max(0, audioDuration - audioProgress))}` : "--:--"}
    </span>
  );

  // Time labels — mobile
  const mobileElapsedLabel = (
    <span className="shrink-0 font-mono text-[11px] text-[var(--text-muted)] tabular-nums w-9 text-right">
      {formatTime(audioProgress)}
    </span>
  );
  const mobileRemainingLabel = (
    <span className="shrink-0 font-mono text-[11px] text-[var(--text-muted)] tabular-nums w-9">
      {hasDuration ? `-${formatTime(Math.max(0, audioDuration - audioProgress))}` : "--:--"}
    </span>
  );

  // Transport buttons
  const prevButton = (size: number) => (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onPrevTrack?.();
      }}
      disabled={!hasPrev}
      className={`shrink-0 flex items-center justify-center rounded-full transition-all duration-200 ease-out ${
        hasPrev
          ? "text-[var(--text)] hover:bg-[var(--text)]/10 active:scale-95 active:-translate-x-0.5"
          : "text-[var(--text-muted)]/40 cursor-default"
      }`}
      style={{ width: size, height: size }}
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
      </svg>
    </button>
  );

  const playPauseButton = (size: number, iconSize: number = 16) => (
    <button
      onClick={onTogglePlay}
      className="shrink-0 rounded-full bg-[var(--text)] text-[var(--bg)] flex items-center justify-center hover:opacity-90 active:scale-95 transition-all duration-200 ease-out"
      style={{ width: size, height: size }}
    >
      {isPlaying ? (
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="currentColor">
          <rect x="5" y="3" width="5" height="18" rx="1" />
          <rect x="14" y="3" width="5" height="18" rx="1" />
        </svg>
      ) : (
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: Math.round(iconSize * 0.1) }}>
          <path d="M6 3.5v17a1 1 0 001.5.86l14-8.5a1 1 0 000-1.72l-14-8.5A1 1 0 006 3.5z" />
        </svg>
      )}
    </button>
  );

  const nextButton = (size: number) => (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onNextTrack?.();
      }}
      className="shrink-0 flex items-center justify-center rounded-full text-[var(--text)] hover:bg-[var(--text)]/10 active:scale-95 active:translate-x-0.5 transition-all duration-200 ease-out"
      style={{ width: size, height: size }}
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
      </svg>
    </button>
  );

  // Close button — corner tab that pokes above the player top border
  const [closeDismissing, setCloseDismissing] = useState(false);

  const handleCloseClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setCloseDismissing(true);
    setTimeout(() => {
      onClose();
      setCloseDismissing(false);
    }, 200);
  }, [onClose]);

  const closeButton = (
    <div
      className="absolute -top-[34px] right-2 z-40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-out"
      style={{ pointerEvents: showClose ? "auto" : "none", visibility: showClose ? "visible" : "hidden" }}
    >
      {/* Hit area: bigger than visible button */}
      <button
        onClick={handleCloseClick}
        className="w-8 h-8 flex items-center justify-center cursor-pointer"
        aria-label="Close player"
      >
        {/* Visible button: smaller, centered inside hit area */}
        <span
          className={`w-5 h-5 flex items-center justify-center rounded-[9px] bg-[var(--bg-alt)] border border-[var(--border)]/40 text-[var(--text)]/70 shadow-[0_2px_6px_rgba(0,0,0,0.2)] transition-all duration-150 ${
            closeDismissing ? "scale-[0.3] opacity-0" : "active:scale-[0.92] active:translate-y-[0.5px]"
          }`}
        >
          <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </span>
      </button>
    </div>
  );

  return (
    <motion.div
      initial={{ y: "100%", opacity: 0.5 }}
      animate={{
        y: 0,
        opacity: 1,
        ...(isMobile ? { height: isMinimized ? 44 : expandedHeightRef.current } : {}),
      }}
      exit={{ y: "100%", opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={`group player-banner fixed left-0 right-0 min-[1152px]:left-[var(--sidebar-width)] bg-[var(--bg-alt)]/85 backdrop-blur-2xl backdrop-saturate-150 border-t border-[var(--border)]/50 overflow-visible`}
      style={{ bottom: 0, ...(!isMobile ? { height: "var(--player-height)" } : {}) }}
    >
      {/* Corner tab close — desktop only */}
      {closeButton}

      {/* ===== DESKTOP layout (sm+): single row, 96px ===== */}
      <div className="h-full hidden min-[1152px]:grid items-center pl-3 pr-3 gap-3" style={{ gridTemplateColumns: "1fr min(100%, 700px) 1fr" }}>
        {/* LEFT: Album art + Track info */}
        <div className="flex items-center gap-2.5 min-w-0">
          {thumbUrl && (
            <Tooltip label="Watch on YouTube" position="top" align="start">
              <div
                key={card.id}
                className={`shrink-0 w-[60px] h-[60px] rounded-md overflow-hidden bg-[var(--bg)] shadow-md animate-art-in relative group/art cursor-pointer transition-opacity duration-300 ${isUnavailable ? "opacity-40" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (card.youtubeUrl) window.open(card.youtubeUrl, "_blank", "noopener,noreferrer");
                }}
              >
                <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
                {card.source === "youtube" && card.youtubeUrl && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/art:opacity-100 transition-opacity duration-200">
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M21.582 6.186a2.506 2.506 0 00-1.768-1.768C18.254 4 12 4 12 4s-6.254 0-7.814.418c-.86.23-1.538.908-1.768 1.768C2 7.746 2 12 2 12s0 4.254.418 5.814c.23.86.908 1.538 1.768 1.768C5.746 20 12 20 12 20s6.254 0 7.814-.418a2.506 2.506 0 001.768-1.768C22 16.254 22 12 22 12s0-4.254-.418-5.814zM10 15.464V8.536L16 12l-6 3.464z" />
                    </svg>
                  </div>
                )}
              </div>
            </Tooltip>
          )}
          <div className="min-w-0">
            {isUnavailable ? (
              <p className="font-mono text-sm text-[var(--text-muted)] uppercase truncate leading-tight">
                Unavailable &middot; skipping&hellip;
              </p>
            ) : (
              <>
                <p className="font-mono text-[14px] text-[var(--text)] uppercase truncate leading-tight font-bold">
                  {card.name}
                </p>
                <p className="font-mono text-[12px] text-[var(--text-secondary)] uppercase truncate leading-tight">
                  {card.artist}
                </p>
              </>
            )}
          </div>
          <div className="shrink-0 ml-auto">
            {eqBars}
          </div>
        </div>

        {/* CENTER: Two rows — controls on top, seek bar below */}
        <div className="flex flex-col items-center justify-center gap-0.5 min-w-0 max-w-[700px] mx-auto w-full">
          {/* Row 1: info, heart, transport, shuffle, locate */}
          <div className="flex items-center gap-1.5">
            {infoButton("md")}
            {likeButton("md")}
            {hasPrev ? <Tooltip label="Previous (p)" position="top">{prevButton(32)}</Tooltip> : prevButton(32)}
            <Tooltip label={isPlaying ? "Pause (space)" : "Play (space)"} position="top">{playPauseButton(38, 16)}</Tooltip>
            <Tooltip label="Next (n)" position="top">{nextButton(32)}</Tooltip>
            {autoPlayButton}
            {locateButton("md")}
          </div>
          {/* Row 2: Seek bar */}
          <div className="w-full flex items-center gap-1.5 px-4">
            {elapsedLabel}
            {seekBar(progressBarRef)}
            {remainingLabel}
          </div>
        </div>

        {/* RIGHT: Queue + Volume + Fullscreen */}
        <div className="flex items-center gap-2.5 justify-self-end relative z-10">
          {queueButton}
          {volumeControl()}
          {fullscreenButton}
        </div>
      </div>

      {/* ===== MOBILE layout ===== */}
      <div className="h-full min-[1152px]:hidden">
        {isMinimized ? (
          /* Minimized micro-strip: enlarge, art, heart, controls, slider, volume */
          <div className="h-full flex items-center gap-2 px-3">
            <button
              onClick={(e) => { e.stopPropagation(); setIsMinimized(false); }}
              className="shrink-0 w-6 h-6 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] transition-all duration-200 active:scale-95"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="18 15 12 9 6 15" />
              </svg>
            </button>
            {thumbUrl && (
              <div className="shrink-0 w-7 h-7 rounded overflow-hidden bg-[var(--bg)]">
                <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            {likeButton("sm")}
            {prevButton(18)}
            {playPauseButton(22, 9)}
            {nextButton(18)}
            <div className="flex-1 min-w-[40px]">
              {seekBar(miniBarRef)}
            </div>
            {mobileVolumePopup()}
          </div>
        ) : (
          <>
          {/* Expanded 3-row layout — narrow mobile (<500px) */}
          <div className="h-full flex flex-col px-4 pt-1.5 pb-0 gap-1 min-[500px]:hidden">
            {/* Row 1: Chevron + Art + Info */}
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                onClick={(e) => { e.stopPropagation(); setIsMinimized(true); }}
                className="shrink-0 w-7 h-7 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] transition-all duration-200 active:scale-95"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {thumbUrl && (
                <a
                  href={card.source === "youtube" && card.youtubeUrl ? card.youtubeUrl : undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  key={card.id}
                  className={`shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-[var(--bg)] shadow-md animate-art-in relative group/art transition-opacity duration-300 ${isUnavailable ? "opacity-40" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!card.youtubeUrl) e.preventDefault();
                  }}
                >
                  <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
                  {card.source === "youtube" && card.youtubeUrl && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/art:opacity-100 transition-opacity duration-200">
                      <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M21.582 6.186a2.506 2.506 0 00-1.768-1.768C18.254 4 12 4 12 4s-6.254 0-7.814.418c-.86.23-1.538.908-1.768 1.768C2 7.746 2 12 2 12s0 4.254.418 5.814c.23.86.908 1.538 1.768 1.768C5.746 20 12 20 12 20s6.254 0 7.814-.418a2.506 2.506 0 001.768-1.768C22 16.254 22 12 22 12s0-4.254-.418-5.814zM10 15.464V8.536L16 12l-6 3.464z" />
                      </svg>
                    </div>
                  )}
                </a>
              )}
              <div className="flex-1 min-w-0">
                {isUnavailable ? (
                  <p className="font-mono text-sm text-[var(--text-muted)] uppercase truncate leading-tight">
                    Unavailable &middot; skipping&hellip;
                  </p>
                ) : (
                  <>
                    <p className="font-mono text-[15px] text-[var(--text)] uppercase truncate leading-tight font-bold">
                      {card.name}
                    </p>
                    <p className="font-mono text-xs text-[var(--text-secondary)] uppercase truncate leading-tight">
                      {card.artist}
                    </p>
                  </>
                )}
              </div>
              <div className="shrink-0">
                {eqBars}
              </div>
            </div>

            {/* Row 2: Transport controls — centered */}
            <div className="flex items-center justify-center gap-3">
              {infoButton("sm")}
              {likeButton("sm")}
              {prevButton(32)}
              {playPauseButton(40, 16)}
              {nextButton(32)}
              {onToggleAutoPlay && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleAutoPlay();
                  }}
                  className={`relative shrink-0 w-7 h-7 flex items-center justify-center transition-all duration-200 ease-out active:scale-95 ${
                    autoPlay
                      ? "text-[var(--text)]"
                      : "text-[var(--text-muted)] hover:text-[var(--text)]"
                  }`}
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill={autoPlay ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 3h5v5" />
                    <path d="M4 20L21 3" />
                    <path d="M21 16v5h-5" />
                    <path d="M15 15l6 6" />
                    <path d="M4 4l5 5" />
                  </svg>
                  <span className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-current transition-opacity duration-200 ${autoPlay ? "opacity-100" : "opacity-0"}`} />
                </button>
              )}
              {queueButton}
              {mobileVolumePopup()}
            </div>

            {/* Row 3: Seek bar */}
            <div className="flex items-center gap-1.5">
              {mobileElapsedLabel}
              {seekBar(mobileProgressBarRef)}
              {mobileRemainingLabel}
            </div>
          </div>

          {/* Expanded 2-row layout — tablet (500-1023px) */}
          <div className="h-full hidden min-[500px]:flex flex-col justify-center px-3 gap-1">
            {/* Row 1: art + controls */}
            <div className="grid items-center gap-2" style={{ gridTemplateColumns: "1fr auto 1fr" }}>
              {/* Left: chevron + art + track info */}
              <div className="flex items-center gap-2 min-w-0" style={{ maxWidth: "clamp(280px, 38vw, 420px)" }}>
                <button
                  onClick={(e) => { e.stopPropagation(); setIsMinimized(true); }}
                  className="shrink-0 w-6 h-6 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] transition-all duration-200 active:scale-95"
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                {thumbUrl && (
                  <a
                    href={card.source === "youtube" && card.youtubeUrl ? card.youtubeUrl : undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    key={card.id}
                    className={`shrink-0 w-10 h-10 rounded-lg overflow-hidden bg-[var(--bg)] shadow-md animate-art-in relative group/art transition-opacity duration-300 ${isUnavailable ? "opacity-40" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!card.youtubeUrl) e.preventDefault();
                    }}
                  >
                    <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
                  </a>
                )}
                <div className="min-w-0 flex-1">
                  {isUnavailable ? (
                    <p className="font-mono text-xs text-[var(--text-muted)] uppercase truncate leading-tight">
                      Unavailable &middot; skipping&hellip;
                    </p>
                  ) : (
                    <>
                      <p className="font-mono text-sm text-[var(--text)] uppercase truncate leading-tight font-bold">
                        {card.name}
                      </p>
                      <p className="font-mono text-[11px] text-[var(--text-secondary)] uppercase truncate leading-tight">
                        {card.artist}
                      </p>
                    </>
                  )}
                </div>
                <div className="shrink-0 ml-auto">
                  {eqBars}
                </div>
              </div>
              {/* Center: info, heart, transport, shuffle, locate */}
              <div className="flex items-center justify-center gap-1">
                {infoButton("sm")}
                {likeButton("sm")}
                {prevButton(28)}
                {playPauseButton(34, 14)}
                {nextButton(28)}
                {onToggleAutoPlay && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleAutoPlay();
                    }}
                    className={`relative shrink-0 w-7 h-7 flex items-center justify-center transition-all duration-200 ease-out active:scale-95 ${
                      autoPlay
                        ? "text-[var(--text)]"
                        : "text-[var(--text-muted)] hover:text-[var(--text)]"
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill={autoPlay ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 3h5v5" />
                      <path d="M4 20L21 3" />
                      <path d="M21 16v5h-5" />
                      <path d="M15 15l6 6" />
                      <path d="M4 4l5 5" />
                    </svg>
                    <span className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-current transition-opacity duration-200 ${autoPlay ? "opacity-100" : "opacity-0"}`} />
                  </button>
                )}
                {locateButton("sm")}
              </div>
              {/* Right: queue + volume + fullscreen */}
              <div className="flex items-center gap-1.5 shrink-0 justify-self-end">
                {queueButton}
                {volumeControl(volTrackTabletRef)}
                {fullscreenButton}
              </div>
            </div>
            {/* Row 2: Seek bar */}
            <div className="flex items-center gap-1.5">
              {mobileElapsedLabel}
              {seekBar(tabletProgressBarRef)}
              {mobileRemainingLabel}
            </div>
          </div>
          </>
        )}
      </div>

      {/* Info popover — shared across all layouts */}
      <AnimatePresence>
        {showInfo && (
          <motion.div
            ref={infoRef}
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="z-50 w-[220px] bg-black/85 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-3 text-left fixed"
            style={infoAnchor ? { left: Math.max(8, infoAnchor.left - 110), bottom: typeof window !== 'undefined' ? window.innerHeight - infoAnchor.top + 8 : 80 } : { bottom: 80, left: 8 }}
            onClick={(e) => e.stopPropagation()}
            onMouseEnter={cancelInfoDismissTimer}
            onMouseLeave={() => { if (showInfo) startInfoDismissTimer(); }}
          >
            <p className="font-mono text-[11px] text-white/90 font-bold truncate">{card.album}</p>
            <div className="flex items-center gap-3 mt-1.5">
              {card.viewCount != null && (
                <span className="font-mono text-[10px] text-white/50">{formatViewCount(card.viewCount)} views</span>
              )}
              {card.publishedAt && (
                <span className="font-mono text-[10px] text-white/50">{formatDate(card.publishedAt)}</span>
              )}
            </div>
            {card.description && (
              <p className="font-mono text-[10px] text-white/40 mt-2 leading-relaxed line-clamp-4">{card.description}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

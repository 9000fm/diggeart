"use client";

import { useState, useCallback, useRef, useEffect, useLayoutEffect, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
// Using <img> instead of next/image — YouTube serves optimized thumbnails already
import Tooltip from "./Tooltip";
import type { CardData } from "@/lib/types";

interface MusicCardProps {
  card: CardData;
  saved: boolean;
  isGracePeriod?: boolean;
  isPlaying: boolean;
  activeTagFilters?: string[];
  viewContext?: string;
  onPlay: () => void;
  onSave: () => void;
  onShare?: () => void;
  isAuthenticated?: boolean;
}

function formatViewCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(0)}K`;
  return String(count);
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

const BURST_COLORS = ["#f87171", "#fb923c", "#f472b6", "#e879f9", "#fbbf24", "#34d399"];

export default memo(function MusicCard({
  card,
  saved,
  isGracePeriod = false,
  isPlaying,
  activeTagFilters = [],
  onPlay,
  onSave,
  viewContext = "default",
  isAuthenticated = true,
}: MusicCardProps) {
  const [now] = useState(() => Date.now());
  const [imgError, setImgError] = useState(false);
  const [nudge, setNudge] = useState(false);
  const [tipLocked, setTipLocked] = useState(false);
  const [burst, setBurst] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const burstKey = useRef(0);
  const prevSavedRef = useRef(saved);

  const [fillUp, setFillUp] = useState(false);

  // Trigger heart fill-from-below on undo/restore ONLY (not manual like)
  const fillTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /* eslint-disable react-hooks/set-state-in-effect -- intentional: animation trigger needs sync setState */
  useLayoutEffect(() => {
    if (saved && !prevSavedRef.current && !burst) {
      setFillUp(true);
      if (fillTimerRef.current) clearTimeout(fillTimerRef.current);
      fillTimerRef.current = setTimeout(() => setFillUp(false), 2500);
    } else if (!saved && fillUp) {
      // Unlike during fill animation — cancel it
      setFillUp(false);
      if (fillTimerRef.current) clearTimeout(fillTimerRef.current);
    }
    prevSavedRef.current = saved;
  }, [saved, burst, fillUp]);
  /* eslint-enable react-hooks/set-state-in-effect */
  const infoRef = useRef<HTMLDivElement>(null);
  const infoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close info popover on outside click
  useEffect(() => {
    if (!showInfo) return;
    const handleClick = (e: MouseEvent) => {
      if (infoRef.current && !infoRef.current.contains(e.target as Node)) setShowInfo(false);
    };
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") setShowInfo(false); };
    const t = setTimeout(() => {
      window.addEventListener("mousedown", handleClick);
      window.addEventListener("keydown", handleKey);
    }, 10);
    return () => { clearTimeout(t); window.removeEventListener("mousedown", handleClick); window.removeEventListener("keydown", handleKey); };
  }, [showInfo]);

  const handlePlay = () => {
    onPlay();
  };

  const heartBtnRef = useRef<HTMLButtonElement>(null);

  const handleHeartClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAuthenticated) {
      if (!saved && heartBtnRef.current) {
        burstKey.current += 1;
        setBurst(true);
        const rect = heartBtnRef.current.getBoundingClientRect();
        const x = (rect.left + rect.width / 2) / window.innerWidth;
        const y = (rect.top + rect.height / 2) / window.innerHeight;
        confetti({
          particleCount: 45,
          spread: 40,
          angle: 90,
          startVelocity: 14,
          gravity: 1.0,
          scalar: 0.5,
          ticks: 50,
          colors: BURST_COLORS,
          origin: { x, y },
          disableForReducedMotion: true,
        });
      }
      onSave();
    } else {
      setNudge(true);
      setTipLocked(true);
      setTimeout(() => { setNudge(false); setTipLocked(false); }, 1500);
    }
  }, [isAuthenticated, onSave, saved]);

  return (
    <motion.div layout layoutId={`${viewContext}-${card.id}`} transition={{ type: "spring", stiffness: 300, damping: 28 }} data-card-id={card.id} className={`group relative aspect-square cursor-pointer bg-[var(--bg-alt)] rounded-2xl transition-[opacity,box-shadow] duration-200 hover:z-10 hover:ring-1 hover:ring-[var(--text-muted)]/20 ${isGracePeriod ? "opacity-75" : ""}`}
      onMouseLeave={() => {
        if (showInfo) {
          infoTimerRef.current = setTimeout(() => setShowInfo(false), 400);
        }
      }}
      onMouseEnter={() => {
        if (infoTimerRef.current) { clearTimeout(infoTimerRef.current); infoTimerRef.current = null; }
      }}
    >
      {/* Clip layer for cover image */}
      <div className="absolute inset-0 overflow-hidden rounded-2xl">
        {imgError ? (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--bg-alt)]"
            onClick={handlePlay}
            title="YouTube"
          >
            <svg className="w-10 h-10 text-[var(--text-muted)] mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="3" />
              <circle cx="12" cy="12" r="6.5" strokeDasharray="2 3" />
            </svg>
            <span className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-widest">DIGEART</span>
          </div>
        ) : (
          <img
            src={card.image || "/placeholder.svg"}
            alt={`${card.name} by ${card.artist}`}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
            onClick={handlePlay}
            onError={() => setImgError(true)}
            title="YouTube"
          />
        )}
      </div>

      {/* Duration badge — top left (for mixes >40min) */}
      {card.duration && card.duration > 2400 && (
        <span className="absolute top-2 left-2 z-10 px-2 py-0.5 bg-black/70 text-white font-mono text-[10px] rounded-md backdrop-blur-sm">
          {formatDuration(card.duration)}
        </span>
      )}

      {/* Status tags — top right */}
      {(() => {
        const isNew = card.publishedAt ? (now - new Date(card.publishedAt).getTime()) / 86400000 <= 30 : false;
        const tags: { label: string; color: string }[] = [];

        // When specific filters are active, trust the API — show matching badges
        if (activeTagFilters.length > 0) {
          if (activeTagFilters.includes("hot")) tags.push({ label: "Hot", color: "bg-red-500" });
          if (activeTagFilters.includes("rare")) tags.push({ label: "Rare", color: "bg-pink-500" });
          if (activeTagFilters.includes("new")) tags.push({ label: "New", color: "bg-emerald-500" });
          // If no specific tags matched above but filters are set, still compute from data
          if (tags.length === 0) {
            if (card.viewCount != null && card.viewCount >= 50_000) tags.push({ label: "Hot", color: "bg-red-500" });
            if (card.viewCount != null && card.viewCount < 10_000 && !isNew && card.publishedAt && (now - new Date(card.publishedAt).getTime()) > 2 * 365 * 86400000) tags.push({ label: "Rare", color: "bg-pink-500" });
            if (isNew) tags.push({ label: "New", color: "bg-emerald-500" });
          }
        } else {
          // No filter — compute from card data
          if (card.viewCount != null && card.viewCount >= 50_000) tags.push({ label: "Hot", color: "bg-red-500" });
          if (card.viewCount != null && card.viewCount < 10_000 && !isNew && card.publishedAt && (now - new Date(card.publishedAt).getTime()) > 2 * 365 * 86400000) tags.push({ label: "Rare", color: "bg-pink-500" });
          if (isNew) tags.push({ label: "New", color: "bg-emerald-500" });
        }

        if (tags.length === 0) return null;
        return (
          <div className="absolute top-2 right-2 z-10 flex flex-col gap-1 items-end min-[1152px]:opacity-0 min-[1152px]:group-hover:opacity-100 transition-opacity duration-200">
            {tags.map((t) => (
              <span key={t.label} className={`px-2.5 py-1 ${t.color} text-white font-mono text-[10px] font-bold tracking-wider rounded-md shadow-sm`}>
                {t.label}
              </span>
            ))}
          </div>
        );
      })()}

      {/* Center EQ — wind-down animation on stop */}
      <div className={`absolute inset-0 flex items-center justify-center z-10 pointer-events-none group-hover:opacity-0 transition-opacity duration-200 ${isPlaying ? "opacity-100" : "opacity-0"}`} style={{ transitionDelay: isPlaying ? "0ms" : "350ms" }}>
        <div className="flex flex-col items-center bg-black/60 rounded-lg px-3 py-2 backdrop-blur-sm">
          <div className="flex items-end gap-[3px] h-10">
            {[1, 2, 3, 4, 5].map((n) => (
              <span key={n} className={`eq-bar-base w-[3px] bg-white rounded-full transition-[transform] duration-300 ease-out ${isPlaying ? `eq-bar-${n}` : "eq-bar-idle"}`} style={{ transitionDelay: isPlaying ? "0ms" : `${(n - 1) * 60}ms` }} />
            ))}
          </div>
          <div className="flex items-start gap-[3px] h-4 opacity-20 overflow-hidden">
            {[1, 2, 3, 4, 5].map((n) => (
              <span key={n} className={`eq-bar-base w-[3px] bg-white rounded-full transition-[transform] duration-300 ease-out ${isPlaying ? `eq-bar-${n}` : "eq-bar-idle"}`} style={{ transitionDelay: isPlaying ? "0ms" : `${(n - 1) * 60}ms`, transformOrigin: "top" }} />
            ))}
          </div>
        </div>
      </div>

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none rounded-2xl" />

      {/* Play/Stop button — center, on hover */}
      <div
        className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        onClick={handlePlay}
      >
        <span
          className={`font-mono text-6xl sm:text-7xl lg:text-8xl leading-none transition-colors drop-shadow-[0_0_20px_rgba(0,0,0,0.8)] ${
            isPlaying ? "text-white" : "text-white hover:text-zinc-300"
          }`}
        >
          {isPlaying ? "❚❚" : "▶"}
        </span>
      </div>

      {/* Action buttons — bottom right */}
      <div className="absolute bottom-2 right-2 z-20 hidden sm:flex items-center gap-1.5">
        {/* Info button — authenticated only */}
        {isAuthenticated && (
          <button
            onClick={(e) => { e.stopPropagation(); setShowInfo((v) => !v); }}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 bg-black/70 text-white/70 hover:bg-black/90 hover:text-white ${
              showInfo ? "opacity-100 text-white" : "opacity-0 group-hover:opacity-100"
            }`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <circle cx="12" cy="8" r="0.5" fill="currentColor" />
            </svg>
          </button>
        )}

        {/* Like button */}
        <Tooltip label={isAuthenticated ? (saved ? "Saved!" : "Save") : "Log in to save"} position="top">
          <motion.button
            ref={heartBtnRef}
            onClick={handleHeartClick}
            onMouseLeave={() => { if (isAuthenticated) setTipLocked(false); }}
            animate={burst ? { scale: [1, 1.4, 1] } : {}}
            transition={{ duration: 0.35, ease: "easeOut" }}
            onAnimationComplete={() => setBurst(false)}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 bg-black/70 text-white hover:bg-black/90 ${
              saved
                ? "opacity-100"
                : isGracePeriod
                  ? "opacity-100"
                  : isAuthenticated
                    ? "opacity-0 group-hover:opacity-100"
                    : "opacity-0 group-hover:opacity-50 cursor-default"
            }`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              {/* Outline (always visible when not saved) */}
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" fill={saved && !fillUp ? "currentColor" : "none"} stroke="currentColor" strokeWidth={saved && !fillUp ? 0 : 2} strokeLinecap="round" strokeLinejoin="round" />
              {/* Fill from below on restore */}
              {fillUp && (
                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" fill="currentColor" className="animate-[heartFillUp_2s_cubic-bezier(0.22,1,0.36,1)_forwards]" />
              )}
            </svg>
          </motion.button>
        </Tooltip>
      </div>

      {/* Info popover */}
      <AnimatePresence>
        {showInfo && (
          <motion.div
            ref={infoRef}
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="absolute bottom-12 right-2 z-30 w-[200px] bg-black/80 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-3 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-mono text-[10px] text-white/90 font-bold truncate">{card.album}</p>
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

      {/* Track info — bottom (desktop hover) */}
      <div className="absolute bottom-0 left-0 right-[72px] z-10 px-2.5 py-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hidden sm:block">
          <p className="font-mono text-sm text-white uppercase truncate leading-tight font-bold drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
            {card.name}
          </p>
          <p className="font-mono text-[10px] text-zinc-300 uppercase tracking-wider truncate drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
            {card.artist}
          </p>
        </div>

      {/* Track info — bottom (mobile) */}
      <div className="absolute bottom-0 left-0 right-0 sm:hidden bg-gradient-to-t from-black/70 to-transparent px-2.5 pt-4 pb-2">
        <p className="font-mono text-xs text-white uppercase truncate leading-tight font-bold drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
          {card.name}
        </p>
        <p className="font-mono text-[10px] text-zinc-300 uppercase tracking-wider truncate drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
          {card.artist}
        </p>
      </div>
    </motion.div>
  );
})

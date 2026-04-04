"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MusicCard from "./MusicCard";
import MaintenanceScreen from "./MaintenanceScreen";
import type { CardData } from "@/lib/types";

interface SavedGridProps {
  cards: CardData[];
  loading: boolean;
  likedIds: Set<string>;
  softDeletedIds?: Set<string>;
  playingId: string | null;
  isPlaying: boolean;
  onPlay: (id: string) => void;
  onToggleLike: (id: string) => void;
  activeTagFilters?: string[];
  isAuthenticated?: boolean;
  onCardsLoaded?: (cards: CardData[]) => void;
  recentlyRemoved?: (CardData & { deletedAt: string })[];
  onRestoreRemoved?: (id: string) => void;
  onHardDelete?: (id: string) => void;
  onClearAllRemoved?: () => void;
}

function daysLeft(deletedAt: string): string {
  const expiry = new Date(deletedAt).getTime() + 7 * 86400000;
  const remaining = Math.max(0, expiry - Date.now());
  const days = Math.ceil(remaining / 86400000);
  if (days <= 0) return "<1d";
  return `${days}d`;
}

export default function SavedGrid({
  cards,
  loading,
  likedIds,
  softDeletedIds,
  playingId,
  isPlaying,
  onPlay,
  onToggleLike,
  activeTagFilters = [],
  isAuthenticated = true,
  onCardsLoaded,
  recentlyRemoved = [],
  onRestoreRemoved,
  onHardDelete,
  onClearAllRemoved,
}: SavedGridProps) {
  const [removedOpen, setRemovedOpen] = useState(false);

  useEffect(() => {
    if (cards.length > 0 && onCardsLoaded) onCardsLoaded(cards);
  }, [cards, onCardsLoaded]);

  const shareCard = async (card: CardData) => {
    const url = card.youtubeUrl || "";
    if (navigator.share) {
      await navigator.share({ title: `${card.name} — ${card.artist}`, url });
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  if (loading) {
    return (
      <div className="dot-grid grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-[11px] p-2 sm:p-[11px]">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="aspect-square skeleton-shimmer rounded-md" />
        ))}
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <svg className="w-12 h-12 text-[var(--text-muted)] mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
        </svg>
        <p className="font-mono text-sm text-[var(--text-muted)] uppercase">Sign in to save tracks</p>
      </div>
    );
  }

  const hasNoContent = cards.length === 0 && recentlyRemoved.length === 0;

  if (hasNoContent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <svg className="w-12 h-12 text-[var(--text-muted)] mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
        </svg>
        <p className="font-mono text-sm text-[var(--text-muted)] uppercase">No saved tracks yet</p>
      </div>
    );
  }

  return (
    <div>
      {/* Main saved cards grid */}
      {cards.length > 0 && (
        <div className="dot-grid grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-[11px] p-2 sm:p-[11px]">
          <AnimatePresence>
            {cards.map((card) => (
              <motion.div
                key={card.id}
                layout
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 300, damping: 28 }}
              >
                <MusicCard
                  card={card}
                  saved={likedIds.has(card.id)}
                  isGracePeriod={softDeletedIds?.has(card.id)}
                  isPlaying={playingId === card.id && isPlaying}
                  activeTagFilters={activeTagFilters}
                  viewContext="saved"
                  onPlay={() => onPlay(card.id)}
                  onSave={() => onToggleLike(card.id)}
                  onShare={() => shareCard(card)}
                  isAuthenticated={isAuthenticated}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Recently removed section */}
      {recentlyRemoved.length > 0 && (
        <div className="mt-2 mx-2 sm:mx-[11px] mb-2">
          {/* Collapsible header */}
          <button
            onClick={() => setRemovedOpen((v) => !v)}
            className="w-full flex items-center gap-2 py-2.5 px-3 rounded-lg bg-[var(--bg-alt)]/50 hover:bg-[var(--bg-alt)]/70 transition-colors cursor-pointer"
          >
            <svg
              className={`w-3 h-3 text-[var(--text-muted)] transition-transform duration-200 ${removedOpen ? "rotate-0" : "-rotate-90"}`}
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
            <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
              Recently removed ({recentlyRemoved.length})
            </span>
          </button>

          {/* Expanded list */}
          <AnimatePresence>
            {removedOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 28 }}
                className="overflow-hidden"
              >
                <div className="py-1">
                  {recentlyRemoved.map((card) => (
                    <div
                      key={card.id}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--bg-alt)]/40 transition-colors group"
                    >
                      {/* Thumbnail */}
                      <img
                        src={card.imageSmall || card.image}
                        alt=""
                        className="w-10 h-10 rounded-md object-cover shrink-0 opacity-60"
                      />
                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-[12px] text-[var(--text)] uppercase truncate leading-tight">
                          {card.name}
                        </p>
                        <p className="font-mono text-[10px] text-[var(--text-muted)] uppercase truncate leading-tight">
                          {card.artist}
                        </p>
                      </div>
                      {/* Countdown badge */}
                      <span className="shrink-0 font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
                        {daysLeft(card.deletedAt)}
                      </span>
                      {/* Actions — visible on hover, always on mobile */}
                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 max-sm:opacity-100 transition-opacity">
                        {/* Play */}
                        <button
                          onClick={() => onPlay(card.id)}
                          className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[var(--text)]/10 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                          title="Play"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                        </button>
                        {/* Restore */}
                        <button
                          onClick={() => onRestoreRemoved?.(card.id)}
                          className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[var(--text)]/10 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                          title="Restore"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></svg>
                        </button>
                        {/* Hard delete */}
                        <button
                          onClick={() => onHardDelete?.(card.id)}
                          className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-400 transition-colors"
                          title="Delete permanently"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                  {/* Clear all */}
                  <div className="flex justify-center pt-2 pb-1">
                    <button
                      onClick={onClearAllRemoved}
                      className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)] hover:text-red-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-500/10"
                    >
                      Clear all
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

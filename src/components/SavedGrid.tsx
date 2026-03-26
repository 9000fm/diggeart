"use client";

import { useEffect } from "react";
import MusicCard from "./MusicCard";
import type { CardData } from "@/lib/types";
import type { TagFilter } from "./Sidebar";

interface SavedGridProps {
  cards: CardData[];
  loading: boolean;
  likedIds: Set<string>;
  softDeletedIds?: Set<string>;
  playingId: string | null;
  isPlaying: boolean;
  onPlay: (id: string) => void;
  onToggleLike: (id: string) => void;
  activeTagFilter?: TagFilter;
  isAuthenticated?: boolean;
  onCardsLoaded?: (cards: CardData[]) => void;
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
  activeTagFilter = "all",
  isAuthenticated = true,
  onCardsLoaded,
}: SavedGridProps) {
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
      <div className="dot-grid grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-[11px] p-2 sm:p-[11px]">
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

  if (cards.length === 0) {
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
    <div className="dot-grid grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-[11px] p-2 sm:p-[11px]">
      {cards.map((card) => (
        <MusicCard
          key={card.id}
          card={card}
          saved={likedIds.has(card.id)}
          isGracePeriod={softDeletedIds?.has(card.id)}
          isPlaying={playingId === card.id && isPlaying}
          activeTagFilter={activeTagFilter}
          viewContext="saved"
          onPlay={() => onPlay(card.id)}
          onSave={() => onToggleLike(card.id)}
          onShare={() => shareCard(card)}
          isAuthenticated={isAuthenticated}
        />
      ))}
    </div>
  );
}

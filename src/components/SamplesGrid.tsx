"use client";

import { useEffect, useState } from "react";
import MusicCard from "./MusicCard";
import type { CardData } from "@/lib/types";

interface SamplesGridProps {
  savedIds: Set<string>;
  likedIds: Set<string>;
  playingId: string | null;
  isPlaying: boolean;
  onPlay: (id: string) => void;
  onToggleSave: (id: string) => void;
  onToggleLike: (id: string) => void;
  onCardsLoaded?: (cards: CardData[]) => void;
}

export default function SamplesGrid({
  savedIds,
  likedIds,
  playingId,
  isPlaying,
  onPlay,
  onToggleSave,
  onToggleLike,
  onCardsLoaded,
}: SamplesGridProps) {
  const [cards, setCards] = useState<CardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSamples() {
      setLoading(true);
      try {
        const res = await fetch("/api/samples");
        const data = await res.json();
        const loaded = data.cards || [];
        setCards(loaded);
        onCardsLoaded?.(loaded);
      } catch (err) {
        console.error("Failed to fetch samples:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchSamples();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const shareCard = async (card: CardData) => {
    const url = card.youtubeUrl || "";
    if (navigator.share) {
      await navigator.share({
        title: `${card.name} — ${card.artist}`,
        url,
      });
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-[11px] p-2 sm:p-[11px]">
        {Array.from({ length: 15 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square skeleton-shimmer rounded-md"
          />
        ))}
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <svg className="w-12 h-12 text-[var(--text-muted)] mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        <p className="font-mono text-sm text-[var(--text-muted)] uppercase">No samples found</p>
        <p className="font-mono text-[11px] text-[var(--text-muted)] mt-1">Approve more channels with niche labels via /curator</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-[11px] p-2 sm:p-[11px]">
      {cards.map((card) => (
        <MusicCard
          key={card.id}
          card={card}
          liked={likedIds.has(card.id)}
          saved={savedIds.has(card.id)}
          isPlaying={playingId === card.id && isPlaying}
          onPlay={() => onPlay(card.id)}
          onLike={() => onToggleLike(card.id)}
          onSave={() => onToggleSave(card.id)}
          onShare={() => shareCard(card)}
        />
      ))}
    </div>
  );
}

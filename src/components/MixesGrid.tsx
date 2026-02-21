"use client";

import { useEffect, useState } from "react";
import MusicCard from "./MusicCard";
import type { CardData } from "@/lib/types";

interface MixesGridProps {
  savedIds: Set<string>;
  likedIds: Set<string>;
  playingId: string | null;
  onPlay: (id: string) => void;
  onToggleSave: (id: string) => void;
  onToggleLike: (id: string) => void;
  onCardsLoaded?: (cards: CardData[]) => void;
}

export default function MixesGrid({
  savedIds,
  likedIds,
  playingId,
  onPlay,
  onToggleSave,
  onToggleLike,
  onCardsLoaded,
}: MixesGridProps) {
  const [cards, setCards] = useState<CardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMixes() {
      setLoading(true);
      try {
        const res = await fetch("/api/mixes");
        const data = await res.json();
        const loaded = data.cards || [];
        setCards(loaded);
        onCardsLoaded?.(loaded);
      } catch (err) {
        console.error("Failed to fetch mixes:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchMixes();
  }, []);

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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5 p-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square skeleton-shimmer rounded-lg"
          />
        ))}
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <svg className="w-12 h-12 text-[var(--text-muted)] mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 9v6h2V9H3zm4-3v12h2V6H7zm4-2v16h2V4h-2zm4 4v8h2V8h-2zm4-1v10h2V7h-2z" />
        </svg>
        <p className="font-mono text-sm text-[var(--text-muted)] uppercase">No mixes found</p>
        <p className="font-mono text-[11px] text-[var(--text-muted)] mt-1">Approve more channels with DJ sets via /curator</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5 p-4">
      {cards.map((card) => (
        <MusicCard
          key={card.id}
          card={card}
          liked={likedIds.has(card.id)}
          saved={savedIds.has(card.id)}
          isPlaying={playingId === card.id}
          onPlay={() => onPlay(card.id)}
          onLike={() => onToggleLike(card.id)}
          onSave={() => onToggleSave(card.id)}
          onShare={() => shareCard(card)}
        />
      ))}
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import MusicCard from "./MusicCard";
import { GENRE_PRESETS } from "./Sidebar";
import type { CardData } from "@/lib/types";

interface DiscoverGridProps {
  showSavedOnly?: boolean;
  savedIds: Set<string>;
  likedIds: Set<string>;
  playingId: string | null;
  onPlay: (id: string) => void;
  onToggleSave: (id: string) => void;
  onToggleLike: (id: string) => void;
  activeGenre: number;
  activeSource: string;
  onCardsLoaded?: (cards: CardData[]) => void;
}

export default function DiscoverGrid({
  showSavedOnly = false,
  savedIds,
  likedIds,
  playingId,
  onPlay,
  onToggleSave,
  onToggleLike,
  activeGenre,
  activeSource,
  onCardsLoaded,
}: DiscoverGridProps) {
  const [cards, setCards] = useState<CardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const observerRef = useRef<HTMLDivElement | null>(null);
  const pageRef = useRef(0);

  const fetchCards = useCallback(
    async (genreIndex: number, source: string, append = false) => {
      if (append) setLoadingMore(true);
      else setLoading(true);

      try {
        const genres = GENRE_PRESETS[genreIndex].genres.join(",");
        const offset = append ? pageRef.current * 30 : 0;
        const res = await fetch(
          `/api/discover?genres=${genres}&limit=30&offset=${offset}&source=${source}`
        );
        const data = await res.json();
        const newCards: CardData[] = data.cards || [];
        onCardsLoaded?.(newCards);

        if (append) {
          setCards((prev) => [...prev, ...newCards]);
        } else {
          setCards(newCards);
          pageRef.current = 0;
        }
        pageRef.current += 1;
      } catch (err) {
        console.error("Failed to fetch:", err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchCards(activeGenre, activeSource);
  }, [activeGenre, activeSource, fetchCards]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          !loading &&
          !loadingMore &&
          cards.length > 0
        ) {
          fetchCards(activeGenre, activeSource, true);
        }
      },
      { rootMargin: "400px" }
    );

    const el = observerRef.current;
    if (el) observer.observe(el);
    return () => {
      if (el) observer.unobserve(el);
    };
  }, [activeGenre, activeSource, loading, loadingMore, cards.length, fetchCards]);

  const shareCard = async (card: CardData) => {
    const url = card.spotifyUrl || card.youtubeUrl || "";
    if (navigator.share) {
      await navigator.share({
        title: `${card.name} — ${card.artist}`,
        url,
      });
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  const displayCards = showSavedOnly
    ? cards.filter((c) => savedIds.has(c.id))
    : cards;

  return (
    <>
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5 sm:gap-3 lg:gap-5 p-1.5 sm:p-3 lg:p-4">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square skeleton-shimmer rounded-lg"
            />
          ))}
        </div>
      ) : (
        <>
          {showSavedOnly && displayCards.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
              <svg className="w-12 h-12 text-[var(--text-muted)] mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
              <p className="font-mono text-sm text-[var(--text-muted)] uppercase">No saved tracks yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5 sm:gap-3 lg:gap-5 p-1.5 sm:p-3 lg:p-4">
              {displayCards.map((card) => (
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
          )}

          <div ref={observerRef} className="flex justify-center py-6">
            {loadingMore && (
              <span className="font-mono text-xs text-[var(--text-muted)] uppercase">
                LOADING...
              </span>
            )}
          </div>
        </>
      )}
    </>
  );
}

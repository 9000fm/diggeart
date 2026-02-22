"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import MusicCard from "./MusicCard";
import { GENRE_PRESETS } from "./Sidebar";
import type { CardData } from "@/lib/types";

interface SpotifyGridProps {
  savedIds: Set<string>;
  likedIds: Set<string>;
  playingId: string | null;
  isPlaying: boolean;
  onPlay: (id: string) => void;
  onToggleSave: (id: string) => void;
  onToggleLike: (id: string) => void;
  activeGenre: number;
  onCardsLoaded?: (cards: CardData[]) => void;
}

export default function SpotifyGrid({
  savedIds,
  likedIds,
  playingId,
  isPlaying,
  onPlay,
  onToggleSave,
  onToggleLike,
  activeGenre,
  onCardsLoaded,
}: SpotifyGridProps) {
  const [cards, setCards] = useState<CardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const observerRef = useRef<HTMLDivElement | null>(null);
  const pageRef = useRef(0);

  const fetchCards = useCallback(
    async (genreIndex: number, append = false) => {
      if (append) setLoadingMore(true);
      else setLoading(true);

      try {
        const genres = GENRE_PRESETS[genreIndex].genres.join(",");
        const offset = append ? pageRef.current * 30 : 0;
        const res = await fetch(
          `/api/discover?genres=${genres}&limit=30&offset=${offset}&source=spotify`
        );
        const data = await res.json();
        const newCards: CardData[] = data.cards || [];
        onCardsLoaded?.(newCards);

        if (append) {
          setCards((prev) => {
            const existingIds = new Set(prev.map((c) => c.id));
            const unique = newCards.filter((c) => !existingIds.has(c.id));
            return [...prev, ...unique];
          });
        } else {
          setCards(newCards);
          pageRef.current = 0;
        }
        pageRef.current += 1;
      } catch (err) {
        console.error("Failed to fetch Spotify cards:", err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => {
    fetchCards(activeGenre);
  }, [activeGenre, fetchCards]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          !loading &&
          !loadingMore &&
          cards.length > 0
        ) {
          fetchCards(activeGenre, true);
        }
      },
      { rootMargin: "400px" }
    );

    const el = observerRef.current;
    if (el) observer.observe(el);
    return () => {
      if (el) observer.unobserve(el);
    };
  }, [activeGenre, loading, loadingMore, cards.length, fetchCards]);

  const shareCard = async (card: CardData) => {
    const url = card.spotifyUrl || "";
    if (navigator.share) {
      await navigator.share({
        title: `${card.name} — ${card.artist}`,
        url,
      });
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  return (
    <>
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-[11px] p-2 sm:p-[11px]">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square skeleton-shimmer rounded-md"
            />
          ))}
        </div>
      ) : (
        <>
          {cards.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
              <svg className="w-12 h-12 text-[var(--text-muted)] mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <circle cx="12" cy="12" r="10" />
                <path strokeLinecap="round" d="M8 15c2.5-1 5.5-.8 8 .5M7.5 12.5c3-1.2 6.5-1 9.5.7M7 10c3.5-1.4 8-1.2 11.5.8" />
              </svg>
              <p className="font-mono text-sm text-[var(--text-muted)] uppercase">No Spotify tracks found</p>
            </div>
          ) : (
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

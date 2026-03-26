"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import MusicCard from "./MusicCard";
import { GENRE_PRESETS } from "./Sidebar";
import type { CardData } from "@/lib/types";

import type { TagFilter } from "./Sidebar";

interface DiscoverGridProps {
  showSavedOnly?: boolean;
  savedIds: Set<string>;
  likedIds: Set<string>;
  playingId: string | null;
  isPlaying: boolean;
  onPlay: (id: string) => void;
  onToggleSave: (id: string) => void;
  onToggleLike: (id: string) => void;
  activeGenre: number;
  activeTagFilter?: TagFilter;
  activeGenreLabel?: string | null;
  onCardsLoaded?: (cards: CardData[]) => void;
  isAuthenticated?: boolean;
}

export default function DiscoverGrid({
  showSavedOnly = false,
  savedIds,
  likedIds,
  playingId,
  isPlaying,
  onPlay,
  onToggleSave,
  onToggleLike,
  activeGenre,
  activeTagFilter = "all",
  activeGenreLabel = null,
  onCardsLoaded,
  isAuthenticated = true,
}: DiscoverGridProps) {
  const [cards, setCards] = useState<CardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const observerRef = useRef<HTMLDivElement | null>(null);
  const pageRef = useRef(0);
  const hasMore = useRef(true);

  const fetchCards = useCallback(
    async (genreIndex: number, tag: TagFilter, genreLabel: string | null, append = false) => {
      if (append && !hasMore.current) return;
      if (append) setLoadingMore(true);
      else { setLoading(true); hasMore.current = true; }

      try {
        const limit = 30;
        const genres = GENRE_PRESETS[genreIndex].genres.join(",");
        const offset = append ? pageRef.current * limit : 0;
        let url = `/api/discover?genres=${genres}&limit=${limit}&offset=${offset}&tag=${tag}`;
        if (genreLabel) url += `&genre=${encodeURIComponent(genreLabel)}`;
        const res = await fetch(url);
        const data = await res.json();
        const newCards: CardData[] = data.cards || [];
        onCardsLoaded?.(newCards);

        hasMore.current = data.hasMore === true;

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
        console.error("Failed to fetch:", err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Refetch on ANY tag change (not just top toggle)
  const prevTagRef = useRef(activeTagFilter);
  const prevGenreLabelRef = useRef(activeGenreLabel);
  useEffect(() => {
    if (prevTagRef.current !== activeTagFilter || prevGenreLabelRef.current !== activeGenreLabel) {
      prevTagRef.current = activeTagFilter;
      prevGenreLabelRef.current = activeGenreLabel;
      fetchCards(activeGenre, activeTagFilter, activeGenreLabel);
    }
  }, [activeTagFilter, activeGenreLabel, activeGenre, fetchCards]);

  useEffect(() => {
    fetchCards(activeGenre, activeTagFilter, activeGenreLabel);
  }, [activeGenre, fetchCards]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          !loading &&
          !loadingMore &&
          cards.length > 0
        ) {
          fetchCards(activeGenre, activeTagFilter, activeGenreLabel, true);
        }
      },
      { rootMargin: "400px" }
    );

    const el = observerRef.current;
    if (el) observer.observe(el);
    return () => {
      if (el) observer.unobserve(el);
    };
  }, [activeGenre, activeTagFilter, activeGenreLabel, loading, loadingMore, cards.length, fetchCards]);

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

  const displayCards = showSavedOnly
    ? cards.filter((c) => savedIds.has(c.id))
    : cards;

  return (
    <>
      {loading ? (
        <div className="dot-grid grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-[11px] p-2 sm:p-[11px]">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square skeleton-shimmer rounded-md"
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
            <div className="dot-grid grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-[11px] p-2 sm:p-[11px]">
              {displayCards.map((card) => (
                <MusicCard
                  key={card.id}
                  card={card}
                  saved={likedIds.has(card.id)}
                  isPlaying={playingId === card.id && isPlaying}
                  activeTagFilter={activeTagFilter}
                  viewContext="home"
                  onPlay={() => onPlay(card.id)}
                  onSave={() => onToggleLike(card.id)}
                  onShare={() => shareCard(card)}
                  isAuthenticated={isAuthenticated}
                />
              ))}
            </div>
          )}

          {!(showSavedOnly && displayCards.length === 0) && (
            <div ref={observerRef} className="flex justify-center py-6">
              {loadingMore && (
                <div className="vinyl-spinner" />
              )}
            </div>
          )}
        </>
      )}
    </>
  );
}

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import MusicCard from "./MusicCard";
import MaintenanceScreen from "./MaintenanceScreen";
import type { CardData } from "@/lib/types";

interface MixesGridProps {
  savedIds: Set<string>;
  likedIds: Set<string>;
  playingId: string | null;
  isPlaying: boolean;
  onPlay: (id: string) => void;
  onToggleSave: (id: string) => void;
  onToggleLike: (id: string) => void;
  activeTagFilters?: string[];
  activeGenreLabels?: string[];
  onCardsLoaded?: (cards: CardData[]) => void;
  isAuthenticated?: boolean;
}

export default function MixesGrid({
  savedIds,
  likedIds,
  playingId,
  isPlaying,
  onPlay,
  onToggleSave,
  onToggleLike,
  activeTagFilters = [],
  activeGenreLabels = [],
  onCardsLoaded,
  isAuthenticated = true,
}: MixesGridProps) {
  const [cards, setCards] = useState<CardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const observerRef = useRef<HTMLDivElement | null>(null);
  const pageRef = useRef(0);
  const hasMore = useRef(true);
  const rotateRef = useRef(Math.floor(Math.random() * 100000));

  const tagKey = activeTagFilters.length > 0 ? activeTagFilters.sort().join(",") : "all";
  const genreKey = activeGenreLabels.length > 0 ? activeGenreLabels.sort().join(",") : "";

  const fetchMixes = useCallback(
    async (tagParam: string, genreParam: string, append = false) => {
      if (append && !hasMore.current) return;
      if (append) setLoadingMore(true);
      else { setLoading(true); hasMore.current = true; }

      try {
        const limit = 20;
        const offset = append ? pageRef.current * limit : 0;
        let url = `/api/mixes?limit=${limit}&offset=${offset}&tag=${tagParam}&rotate=${rotateRef.current}`;
        if (genreParam) url += `&genre=${encodeURIComponent(genreParam)}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);
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
        console.error("Failed to fetch mixes:", err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const prevTagRef = useRef(tagKey);
  const prevGenreLabelRef = useRef(genreKey);
  useEffect(() => {
    if (prevTagRef.current !== tagKey || prevGenreLabelRef.current !== genreKey) {
      prevTagRef.current = tagKey;
      prevGenreLabelRef.current = genreKey;
      fetchMixes(tagKey, genreKey);
    }
  }, [tagKey, genreKey, fetchMixes]);

  useEffect(() => {
    fetchMixes(tagKey, genreKey);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          !loading &&
          !loadingMore &&
          cards.length > 0
        ) {
          fetchMixes(tagKey, genreKey, true);
        }
      },
      { rootMargin: "400px" }
    );

    const el = observerRef.current;
    if (el) observer.observe(el);
    return () => {
      if (el) observer.unobserve(el);
    };
  }, [tagKey, genreKey, loading, loadingMore, cards.length, fetchMixes]);

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
      <div className="dot-grid grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-[11px] p-2 sm:p-[11px]">
        {Array.from({ length: 25 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square skeleton-shimmer rounded-md"
          />
        ))}
      </div>
    );
  }

  if (cards.length === 0) {
    return <MaintenanceScreen />;
  }

  return (
    <>
      <div className="dot-grid grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-[11px] p-2 sm:p-[11px]">
        {cards.map((card) => (
          <MusicCard
            key={card.id}
            card={card}
            saved={likedIds.has(card.id)}
            isPlaying={playingId === card.id && isPlaying}
            activeTagFilters={activeTagFilters}
            viewContext="mixes"
            onPlay={() => onPlay(card.id)}
            onSave={() => onToggleLike(card.id)}
            onShare={() => shareCard(card)}
            isAuthenticated={isAuthenticated}
          />
        ))}
      </div>

      <div ref={observerRef} className="flex justify-center py-6">
        {loadingMore && (
          <div className="vinyl-spinner" />
        )}
      </div>
    </>
  );
}

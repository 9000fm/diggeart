"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import MusicCard, { CardData } from "./MusicCard";

const GENRE_PRESETS = [
  { label: "All Vibes", genres: ["pop", "electronic", "hip-hop"] },
  { label: "Electronic", genres: ["electronic", "house", "techno"] },
  { label: "Hip Hop", genres: ["hip-hop", "r-n-b"] },
  { label: "Rock", genres: ["rock", "indie", "alternative"] },
  { label: "Latin", genres: ["latin", "reggaeton"] },
  { label: "Chill", genres: ["ambient", "chill", "acoustic"] },
  { label: "Dance", genres: ["dance", "edm", "house"] },
  { label: "Jazz", genres: ["jazz", "soul"] },
  { label: "Funk", genres: ["funk", "disco"] },
];

export default function DiscoverGrid() {
  const [cards, setCards] = useState<CardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeGenre, setActiveGenre] = useState(0);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const observerRef = useRef<HTMLDivElement | null>(null);
  const pageRef = useRef(0);

  const fetchCards = useCallback(async (genreIndex: number, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);

    try {
      const genres = GENRE_PRESETS[genreIndex].genres.join(",");
      const offset = append ? pageRef.current * 30 : 0;
      const res = await fetch(`/api/discover?genres=${genres}&limit=30&offset=${offset}`);
      const data = await res.json();
      const newCards = data.cards || [];

      if (append) {
        setCards(prev => [...prev, ...newCards]);
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
  }, []);

  useEffect(() => {
    fetchCards(activeGenre);
  }, [activeGenre, fetchCards]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && !loadingMore && cards.length > 0) {
          fetchCards(activeGenre, true);
        }
      },
      { rootMargin: "400px" }
    );

    const el = observerRef.current;
    if (el) observer.observe(el);
    return () => { if (el) observer.unobserve(el); };
  }, [activeGenre, loading, loadingMore, cards.length, fetchCards]);

  const toggleSave = (id: string) => {
    setSavedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleLike = (id: string) => {
    setLikedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const shareCard = async (card: CardData) => {
    if (navigator.share) {
      await navigator.share({
        title: `${card.name} — ${card.artist}`,
        url: card.spotifyUrl,
      });
    } else {
      await navigator.clipboard.writeText(card.spotifyUrl);
    }
  };

  return (
    <div className="space-y-6">
      {/* Genre filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {GENRE_PRESETS.map((preset, i) => (
          <button
            key={preset.label}
            onClick={() => setActiveGenre(i)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 ${
              i === activeGenre
                ? "bg-amber-500 text-black"
                : "bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-700/80"
            }`}
          >
            {preset.label}
          </button>
        ))}
        <button
          onClick={() => fetchCards(activeGenre)}
          className="px-4 py-2 rounded-full text-sm font-medium bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-700/80 transition-all duration-200"
          title="Refresh"
        >
          ↻
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="columns-2 sm:columns-3 lg:columns-4 xl:columns-5 gap-4 space-y-4">
          {Array.from({ length: 15 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl bg-zinc-900/80 border border-zinc-800/50 overflow-hidden break-inside-avoid animate-pulse"
            >
              <div className="aspect-square bg-zinc-800" />
              <div className="p-3.5 space-y-2">
                <div className="h-4 bg-zinc-800 rounded w-3/4" />
                <div className="h-3 bg-zinc-800 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="columns-2 sm:columns-3 lg:columns-4 xl:columns-5 gap-4 space-y-4">
            {cards.map((card) => (
              <div key={card.id} className="break-inside-avoid">
                <MusicCard
                  card={card}
                  liked={likedIds.has(card.id)}
                  saved={savedIds.has(card.id)}
                  onLike={() => toggleLike(card.id)}
                  onSave={() => toggleSave(card.id)}
                  onShare={() => shareCard(card)}
                />
              </div>
            ))}
          </div>

          {/* Infinite scroll trigger */}
          <div ref={observerRef} className="flex justify-center py-8">
            {loadingMore && (
              <div className="flex gap-1.5">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

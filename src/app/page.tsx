"use client";

import { useState, useCallback, useRef } from "react";
import DiscoverGrid from "@/components/DiscoverGrid";
import MixesGrid from "@/components/MixesGrid";
import NowPlayingBanner from "@/components/NowPlayingBanner";
import Sidebar from "@/components/Sidebar";
import type { ViewType } from "@/components/Sidebar";
import type { CardData } from "@/lib/types";

export default function Home() {
  const [activeView, setActiveView] = useState<ViewType>("home");
  const [activeGenre, setActiveGenre] = useState(0);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [nowPlayingCard, setNowPlayingCard] = useState<CardData | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const cardRegistry = useRef<Map<string, CardData>>(new Map());

  const registerCards = useCallback((cards: CardData[]) => {
    for (const c of cards) {
      cardRegistry.current.set(c.id, c);
    }
  }, []);

  const handlePlay = useCallback((id: string) => {
    setPlayingId(id);
    setIsPlaying(true);
    const card = cardRegistry.current.get(id);
    if (card) setNowPlayingCard(card);
  }, []);

  const toggleSave = useCallback((id: string) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleLike = useCallback((id: string) => {
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleTogglePlay = useCallback(() => {
    if (isPlaying) {
      setPlayingId(null);
      setIsPlaying(false);
    } else if (nowPlayingCard) {
      setPlayingId(nowPlayingCard.id);
      setIsPlaying(true);
    }
  }, [isPlaying, nowPlayingCard]);

  const handleClosePlayer = useCallback(() => {
    setPlayingId(null);
    setIsPlaying(false);
    setNowPlayingCard(null);
  }, []);

  const handleViewChange = useCallback((view: ViewType) => {
    setActiveView(view);
  }, []);

  const activeSource = activeView === "samples" ? "youtube" : "all";

  return (
    <main className={`min-h-screen bg-[var(--bg)] pt-[calc(var(--banner-height)+6.5rem)] lg:pt-[calc(var(--banner-height)+var(--header-height))] lg:ml-[var(--sidebar-width)] ${nowPlayingCard ? "pb-12" : ""}`}>
      <Sidebar
        activeView={activeView}
        onViewChange={handleViewChange}
        activeGenre={activeGenre}
        onGenreChange={setActiveGenre}
      />

      {(activeView === "home" || activeView === "samples") && (
        <DiscoverGrid
          savedIds={savedIds}
          likedIds={likedIds}
          playingId={playingId}
          onPlay={handlePlay}
          onToggleSave={toggleSave}
          onToggleLike={toggleLike}
          activeGenre={activeGenre}
          activeSource={activeSource}
          onCardsLoaded={registerCards}
        />
      )}

      {activeView === "mixes" && (
        <MixesGrid
          savedIds={savedIds}
          likedIds={likedIds}
          playingId={playingId}
          onPlay={handlePlay}
          onToggleSave={toggleSave}
          onToggleLike={toggleLike}
          onCardsLoaded={registerCards}
        />
      )}

      {activeView === "saved" && (
        <DiscoverGrid
          showSavedOnly
          savedIds={savedIds}
          likedIds={likedIds}
          playingId={playingId}
          onPlay={handlePlay}
          onToggleSave={toggleSave}
          onToggleLike={toggleLike}
          activeGenre={activeGenre}
          activeSource={activeSource}
          onCardsLoaded={registerCards}
        />
      )}

      {nowPlayingCard && (
        <NowPlayingBanner
          card={nowPlayingCard}
          isPlaying={isPlaying}
          onTogglePlay={handleTogglePlay}
          onClose={handleClosePlayer}
        />
      )}
    </main>
  );
}

"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import DiscoverGrid from "@/components/DiscoverGrid";
import MixesGrid from "@/components/MixesGrid";
import SamplesGrid from "@/components/SamplesGrid";
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
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [playerClosing, setPlayerClosing] = useState(false);
  const [ytVideoId, setYtVideoId] = useState<string | null>(null);
  const cardRegistry = useRef<Map<string, CardData>>(new Map());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ytIframeRef = useRef<HTMLIFrameElement | null>(null);
  const ytElapsedRef = useRef(0);
  const ytIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ytSavedVideoId = useRef<string | null>(null);

  const clearYtInterval = useCallback(() => {
    if (ytIntervalRef.current) {
      clearInterval(ytIntervalRef.current);
      ytIntervalRef.current = null;
    }
  }, []);

  const registerCards = useCallback((cards: CardData[]) => {
    for (const c of cards) {
      cardRegistry.current.set(c.id, c);
    }
  }, []);

  // Synthetic elapsed-time tracker for YouTube playback
  useEffect(() => {
    if (isPlaying && nowPlayingCard?.source === "youtube") {
      clearYtInterval();
      ytIntervalRef.current = setInterval(() => {
        ytElapsedRef.current += 1;
        setAudioProgress(ytElapsedRef.current);
      }, 1000);
    } else {
      clearYtInterval();
    }
    return () => clearYtInterval();
  }, [isPlaying, nowPlayingCard?.source, nowPlayingCard?.id, clearYtInterval]);

  const handlePlay = useCallback((id: string) => {
    const card = cardRegistry.current.get(id);
    if (!card) return;

    setPlayingId(id);
    setIsPlaying(true);
    setAudioProgress(0);
    setAudioDuration(0);
    setNowPlayingCard(card);

    if (card.source === "youtube" && card.videoId) {
      // YouTube — use hidden persistent iframe
      ytElapsedRef.current = 0;
      ytSavedVideoId.current = null;
      setAudioDuration(card.duration || 0);
      setYtVideoId(card.videoId);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute("src");
        audioRef.current.load();
      }
    } else if (card.source === "spotify" && card.previewUrl && audioRef.current) {
      // Spotify — use persistent audio element
      setYtVideoId(null);
      const audio = audioRef.current;
      audio.src = card.previewUrl;
      audio.load();
      audio.play().catch(() => {});
    } else {
      // No preview — stop everything
      setYtVideoId(null);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute("src");
        audioRef.current.load();
      }
    }
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
      // Pause
      if (audioRef.current && audioRef.current.src) {
        audioRef.current.pause();
      }
      // YouTube: kill playback by clearing iframe src, save video ID for resume
      if (ytVideoId && ytIframeRef.current) {
        ytSavedVideoId.current = ytVideoId;
        ytIframeRef.current.src = "";
      }
      setPlayingId(null);
      setIsPlaying(false);
    } else if (nowPlayingCard) {
      // Resume
      setPlayingId(nowPlayingCard.id);
      setIsPlaying(true);
      if (audioRef.current && audioRef.current.src) {
        audioRef.current.play().catch(() => {});
      }
      // YouTube: restore iframe src with start= to resume from correct position
      if (ytSavedVideoId.current && ytIframeRef.current) {
        const startSeconds = Math.floor(ytElapsedRef.current);
        ytIframeRef.current.src = `https://www.youtube.com/embed/${ytSavedVideoId.current}?autoplay=1&enablejsapi=1&rel=0&start=${startSeconds}`;
        ytSavedVideoId.current = null;
      }
    }
  }, [isPlaying, nowPlayingCard, ytVideoId]);

  const handleClosePlayer = useCallback(() => {
    setPlayerClosing(true);
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute("src");
        audioRef.current.load();
      }
      if (ytIframeRef.current) {
        ytIframeRef.current.src = "";
      }
      clearYtInterval();
      ytElapsedRef.current = 0;
      ytSavedVideoId.current = null;
      setYtVideoId(null);
      setPlayingId(null);
      setIsPlaying(false);
      setNowPlayingCard(null);
      setAudioProgress(0);
      setAudioDuration(0);
      setPlayerClosing(false);
    }, 300);
  }, [clearYtInterval]);

  const handleViewChange = useCallback((view: ViewType) => {
    // Audio persists across view switches (Spotify via <audio>, YouTube via hidden iframe)
    setActiveView(view);
  }, []);

  const handleLocateCard = useCallback(() => {
    if (!nowPlayingCard) return;
    const el = document.querySelector(`[data-card-id="${nowPlayingCard.id}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-[var(--accent)]");
      setTimeout(() => el.classList.remove("ring-2", "ring-[var(--accent)]"), 1500);
    }
  }, [nowPlayingCard]);

  const handleSeek = useCallback((seconds: number) => {
    if (nowPlayingCard?.source === "youtube" && ytIframeRef.current && ytVideoId) {
      // YouTube: reload iframe with start= parameter
      const startSeconds = Math.floor(seconds);
      ytIframeRef.current.src = `https://www.youtube.com/embed/${ytVideoId}?autoplay=1&enablejsapi=1&rel=0&start=${startSeconds}`;
      ytElapsedRef.current = seconds;
      setAudioProgress(seconds);
    } else if (audioRef.current && audioRef.current.duration) {
      audioRef.current.currentTime = seconds;
      setAudioProgress(seconds);
    }
  }, [nowPlayingCard?.source, ytVideoId]);

  // Audio element event handlers
  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setAudioProgress(audioRef.current.currentTime);
      setAudioDuration(audioRef.current.duration || 0);
    }
  }, []);

  const handleAudioEnded = useCallback(() => {
    setIsPlaying(false);
    setPlayingId(null);
    setAudioProgress(0);
  }, []);

  const activeSource = "youtube";

  // Calculate top padding: banner + header + player (when active)
  const hasPlayer = !!nowPlayingCard && !playerClosing;

  return (
    <main
      className="layout-shift min-h-screen bg-[var(--bg)] lg:ml-[var(--sidebar-width)]"
      data-player={hasPlayer ? "true" : "false"}
    >
      {/* Persistent audio element — survives view switches */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleAudioEnded}
        preload="none"
      />

      {/* Persistent hidden YouTube iframe — always rendered, src toggled */}
      <iframe
        ref={ytIframeRef}
        src={ytVideoId ? `https://www.youtube.com/embed/${ytVideoId}?autoplay=1&enablejsapi=1&rel=0` : ""}
        allow="autoplay; encrypted-media"
        className="fixed w-px h-px opacity-0 pointer-events-none"
        style={{ top: 0, left: 0 }}
      />

      <Sidebar
        activeView={activeView}
        onViewChange={handleViewChange}
        activeGenre={activeGenre}
        onGenreChange={setActiveGenre}
      />

      {activeView === "home" && (
        <DiscoverGrid
          savedIds={savedIds}
          likedIds={likedIds}
          playingId={playingId}
          isPlaying={isPlaying}
          onPlay={handlePlay}
          onToggleSave={toggleSave}
          onToggleLike={toggleLike}
          activeGenre={activeGenre}
          activeSource={activeSource}
          onCardsLoaded={registerCards}
        />
      )}

      {activeView === "samples" && (
        <SamplesGrid
          savedIds={savedIds}
          likedIds={likedIds}
          playingId={playingId}
          isPlaying={isPlaying}
          onPlay={handlePlay}
          onToggleSave={toggleSave}
          onToggleLike={toggleLike}
          onCardsLoaded={registerCards}
        />
      )}

      {activeView === "mixes" && (
        <MixesGrid
          savedIds={savedIds}
          likedIds={likedIds}
          playingId={playingId}
          isPlaying={isPlaying}
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
          isPlaying={isPlaying}
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
          onLocate={handleLocateCard}
          audioProgress={audioProgress}
          audioDuration={audioDuration}
          onSeek={handleSeek}
          closing={playerClosing}
        />
      )}
    </main>
  );
}

"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

import { useState, useCallback, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { AnimatePresence } from "framer-motion";
import DiscoverGrid from "@/components/DiscoverGrid";
import MixesGrid from "@/components/MixesGrid";
import SamplesGrid from "@/components/SamplesGrid";
import SavedGrid from "@/components/SavedGrid";
import { supabase } from "@/lib/supabase";
import NowPlayingBanner from "@/components/NowPlayingBanner";
import Sidebar from "@/components/Sidebar";
import UndoToast from "@/components/UndoToast";
import OnboardingOverlay from "@/components/OnboardingOverlay";
import QueuePanel from "@/components/QueuePanel";
import WelcomeScreen from "@/components/WelcomeScreen";
import type { ViewType } from "@/components/Sidebar";
import type { CardData } from "@/lib/types";

/* ── YouTube IFrame API types ── */
interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  stopVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  setVolume(volume: number): void;
  getVolume(): number;
  mute(): void;
  unMute(): void;
  isMuted(): boolean;
  getDuration(): number;
  getCurrentTime(): number;
  getPlayerState(): number;
  destroy(): void;
  loadVideoById(videoId: string, startSeconds?: number): void;
  cueVideoById(videoId: string, startSeconds?: number): void;
}

interface YTPlayerEvent {
  target: YTPlayer;
  data: number;
}

// YT types are declared in youtube-player.ts — use the local interfaces here
// without re-declaring on Window (which conflicts with the `any` declaration)

export default function Home() {
  const { data: session } = useSession();
  const isAuthenticated = !!session;
  const [activeView, setActiveView] = useState<ViewType>("home");
  const [activeGenre, setActiveGenre] = useState(0);
  const [activeTagFilters, setActiveTagFilters] = useState<string[]>([]);
  const [activeGenreLabels, setActiveGenreLabels] = useState<string[]>([]);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [nowPlayingCard, setNowPlayingCard] = useState<CardData | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(true);
  const [canGoPrev, setCanGoPrev] = useState(false);
  const [volume, setVolume] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("digeart-volume");
      return saved ? parseInt(saved, 10) : 80;
    }
    return 80;
  });
  const [isMuted, setIsMuted] = useState(false);
  const volumeRef = useRef(volume);
  volumeRef.current = volume;
  const isMutedRef = useRef(isMuted);
  isMutedRef.current = isMuted;
  const [skippingUnavailable, setSkippingUnavailable] = useState(false);
  const [savedCards, setSavedCards] = useState<CardData[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [softDeletedIds, setSoftDeletedIds] = useState<Set<string>>(new Set());
  const [recentlyRemoved, setRecentlyRemoved] = useState<(CardData & { deletedAt: string })[]>([]);
  const [showAbout, setShowAbout] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [mountedTabs, setMountedTabs] = useState<Set<ViewType>>(new Set(["home"]));
  const scrollPositions = useRef<Record<string, number>>({});

  // Undo unlike state
  const [undoToastVisible, setUndoToastVisible] = useState(false);
  const [undoTrackName, setUndoTrackName] = useState("");
  const [undoRestoredId, setUndoRestoredId] = useState<string | null>(null);
  const pendingUnlike = useRef<{ id: string; card: CardData; timer: ReturnType<typeof setTimeout> } | null>(null);

  const skippingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cardRegistry = useRef<Map<string, CardData>>(new Map());
  const cardViewMap = useRef<Map<string, ViewType>>(new Map());
  const playOriginView = useRef<ViewType | null>(null);
  const activeViewRef = useRef(activeView);
  activeViewRef.current = activeView;
  const shuffleQueue = useRef<string[]>([]);
  const queueIndex = useRef(-1);
  const queueView = useRef<ViewType | null>(null);
  // YT IFrame API refs
  const ytPlayerRef = useRef<YTPlayer | null>(null);
  const ytContainerRef = useRef<HTMLDivElement | null>(null);
  const ytPendingVideoId = useRef<string | null>(null);
  const ytProgressInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const ytPlayerReady = useRef(false);
  const hasAdvancedRef = useRef(false);

  // ── Load YouTube IFrame API script + pre-create player ──
  useEffect(() => {
    if (typeof window === "undefined") return;

    const initPlayer = () => {
      // Pre-create player (no video, no autoplay) so first user play
      // goes through loadVideoById — works within mobile gesture context
      if (!ytPlayerRef.current && ytContainerRef.current) {
        const div = document.createElement("div");
        div.id = "yt-player-target";
        ytContainerRef.current.innerHTML = "";
        ytContainerRef.current.appendChild(div);

        ytPlayerRef.current = new window.YT.Player("yt-player-target", {
          height: "1",
          width: "1",
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
          },
          events: {
            onReady: (event: YTPlayerEvent) => {
              ytPlayerReady.current = true;
              event.target.setVolume(volumeRef.current);
              if (isMutedRef.current) event.target.mute();
              // If user clicked a track before player was ready, play it now
              if (ytPendingVideoId.current) {
                event.target.loadVideoById(ytPendingVideoId.current);
                ytPendingVideoId.current = null;
                startYTProgressPoller();
              }
            },
            onStateChange: (event: YTPlayerEvent) => {
              handleYTStateChange.current?.(event);
            },
            onError: () => {
              setSkippingUnavailable(true);
              if (skippingTimerRef.current) clearTimeout(skippingTimerRef.current);
              skippingTimerRef.current = setTimeout(() => {
                setSkippingUnavailable(false);
                handleNextTrackRef.current?.();
              }, 1500);
            },
          },
        });
      }
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
      return;
    }
    window.onYouTubeIframeAPIReady = initPlayer;
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  }, []);

  // ── Cleanup progress interval on unmount ──
  useEffect(() => {
    return () => {
      if (ytProgressInterval.current) clearInterval(ytProgressInterval.current);
    };
  }, []);

  // ── Supabase: load saved likes on mount ──
  useEffect(() => {
    if (!session?.user?.email) return;
    const email = session.user.email;
    setSavedLoading(true);
    supabase
      .from("likes")
      .select("video_id, card_data, deleted_at")
      .eq("user_email", email)
      .or("deleted_at.is.null,deleted_at.gte." + new Date(Date.now() - 7 * 86400000).toISOString())
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error("Failed to load likes:", error);
          setSavedLoading(false);
          return;
        }
        const ids = new Set<string>();
        const activeCards: CardData[] = [];
        const removed: (CardData & { deletedAt: string })[] = [];
        for (const row of data || []) {
          if (row.deleted_at === null) {
            ids.add(row.video_id);
            activeCards.push(row.card_data as CardData);
          } else {
            removed.push({ ...(row.card_data as CardData), deletedAt: row.deleted_at });
          }
        }
        setLikedIds(ids);
        setSoftDeletedIds(new Set());
        setSavedCards(activeCards);
        setRecentlyRemoved(removed);
        setSavedLoading(false);
      });
  }, [session?.user?.email]);

  // ── Onboarding: welcome (pre-login) + spotlight (post-login, first time) ──
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem("digeart-welcome-seen")) {
      setShowWelcome(true);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (typeof window === "undefined") return;
    // Mark welcome as seen once authenticated
    localStorage.setItem("digeart-welcome-seen", "1");
    setShowWelcome(false);
    if (!localStorage.getItem("digeart-onboarded")) {
      // Small delay so the UI has rendered
      const timer = setTimeout(() => setShowOnboarding(true), 600);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated]);

  const handleOnboardingComplete = useCallback(() => {
    setShowOnboarding(false);
    localStorage.setItem("digeart-onboarded", "1");
  }, []);

  const handleWelcomeDismiss = useCallback(() => {
    setShowWelcome(false);
    localStorage.setItem("digeart-welcome-seen", "1");
  }, []);

  // ── YT progress poller (also handles background-tab end detection) ──
  const startYTProgressPoller = useCallback(() => {
    if (ytProgressInterval.current) clearInterval(ytProgressInterval.current);
    ytProgressInterval.current = setInterval(() => {
      const p = ytPlayerRef.current;
      if (!p) return;
      try {
        const current = p.getCurrentTime();
        const duration = p.getDuration();
        const state = p.getPlayerState();
        // Update progress when playing (1) or buffering (3) with valid data
        if (state === 1 || (state === 3 && duration > 0 && current > 0)) {
          setAudioProgress(current);
          if (duration > 0) setAudioDuration(duration);
        }
        // End detection — catches track end even in background tabs
        // where onStateChange(ENDED) is deferred
        if (duration > 0 && current >= duration - 0.5 && !hasAdvancedRef.current) {
          hasAdvancedRef.current = true;
          clearInterval(ytProgressInterval.current!);
          ytProgressInterval.current = null;
          handleNextTrackRef.current?.();
        }
      } catch {
        // player may not be ready
      }
    }, 250);
  }, []);

  const stopYTProgressPoller = useCallback(() => {
    if (ytProgressInterval.current) {
      clearInterval(ytProgressInterval.current);
      ytProgressInterval.current = null;
    }
  }, []);

  // ── Auto-advance refs (to avoid stale closures in YT callbacks) ──
  const autoPlayEnabledRef = useRef(autoPlayEnabled);
  autoPlayEnabledRef.current = autoPlayEnabled;
  const nowPlayingCardRef = useRef(nowPlayingCard);
  nowPlayingCardRef.current = nowPlayingCard;

  // ── Create / load YT player ──
  const handleYTStateChange = useRef<((event: YTPlayerEvent) => void) | null>(null);

  const createYTPlayer = useCallback((videoId: string) => {
    if (!ytPlayerReady.current) {
      // Player not ready yet — queue for when onReady fires
      ytPendingVideoId.current = videoId;
      return;
    }
    ytPlayerRef.current!.loadVideoById(videoId);
    startYTProgressPoller();
    // Safari fallback: if playback hasn't started after 1s, retry playVideo()
    setTimeout(() => {
      try {
        const p = ytPlayerRef.current;
        if (p && p.getPlayerState() !== 1) {
          p.playVideo();
        }
      } catch { /* ignore */ }
    }, 1000);
  }, [startYTProgressPoller]);

  // Keep handleYTStateChange in sync
  useEffect(() => {
    handleYTStateChange.current = (event: YTPlayerEvent) => {
      if (event.data === 0 && !hasAdvancedRef.current) {
        // ENDED
        hasAdvancedRef.current = true;
        stopYTProgressPoller();
        handleNextTrackRef.current?.();
      } else if (event.data === 1) {
        // PLAYING — new video confirmed; safe to re-arm end detection
        hasAdvancedRef.current = false;
        setIsPlaying(true);
        startYTProgressPoller();
        // Get real duration
        try {
          const dur = event.target.getDuration();
          if (dur > 0) setAudioDuration(dur);
        } catch { /* ignore */ }
      } else if (event.data === 2) {
        // PAUSED
        // Don't set isPlaying to false here — we control it ourselves
      }
    };
  }, [stopYTProgressPoller, startYTProgressPoller]);

  const registerCards = useCallback((cards: CardData[], view: ViewType) => {
    const newIds: string[] = [];
    for (const c of cards) {
      const isNew = !cardRegistry.current.has(c.id);
      cardRegistry.current.set(c.id, c);
      // Don't let the saved view overwrite a card's real origin
      if (view !== "saved" || !cardViewMap.current.has(c.id)) {
        cardViewMap.current.set(c.id, view);
      }
      // Track genuinely new cards for queue injection
      if (isNew && view === queueView.current) {
        newIds.push(c.id);
      }
    }
    // Silently append new cards (shuffled) to the END of the queue
    // This keeps the visible "Up next" list stable — new cards appear after existing ones
    if (newIds.length > 0 && shuffleQueue.current.length > 0) {
      fisherYatesShuffle(newIds);
      shuffleQueue.current.push(...newIds);
    }
  }, []);

  const registerHomeCards = useCallback(
    (cards: CardData[]) => registerCards(cards, "home"),
    [registerCards]
  );
  const registerSamplesCards = useCallback(
    (cards: CardData[]) => registerCards(cards, "samples"),
    [registerCards]
  );
  const registerMixesCards = useCallback(
    (cards: CardData[]) => registerCards(cards, "mixes"),
    [registerCards]
  );
  const registerSavedCards = useCallback(
    (cards: CardData[]) => registerCards(cards, "saved"),
    [registerCards]
  );


  // ── Shuffle queue helpers ──

  // Fisher-Yates shuffle (in-place)
  const fisherYatesShuffle = (arr: string[]) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  // Build a queue of card IDs for a given view
  const buildQueue = useCallback((startingCardId: string, shuffle: boolean) => {
    const view = cardViewMap.current.get(startingCardId) || activeViewRef.current;
    const ids = Array.from(cardRegistry.current.entries())
      .filter(([id]) => cardViewMap.current.get(id) === view)
      .map(([id]) => id);

    if (shuffle) {
      fisherYatesShuffle(ids);
    }

    // Move starting card to front
    const startIdx = ids.indexOf(startingCardId);
    if (startIdx > 0) {
      ids.splice(startIdx, 1);
      ids.unshift(startingCardId);
    }

    shuffleQueue.current = ids;
    queueIndex.current = 0;
    queueView.current = view;
    setCanGoPrev(false);
  }, []);

  // Internal play handler (simplified — no history/forward stack)
  const handlePlayInternal = useCallback((card: CardData) => {
    setPlayingId(card.id);
    setIsPlaying(true);
    setAudioProgress(0);
    setAudioDuration(card.duration || 0);
    setNowPlayingCard(card);
    setCanGoPrev(queueIndex.current > 0);

    if (card.source === "youtube" && card.videoId) {
      createYTPlayer(card.videoId);
    } else {
      // No playable source — show unavailable feedback then auto-advance
      stopYTProgressPoller();
      if (ytPlayerRef.current) {
        try { ytPlayerRef.current.stopVideo(); } catch { /* ignore */ }
      }
      setSkippingUnavailable(true);
      if (skippingTimerRef.current) clearTimeout(skippingTimerRef.current);
      skippingTimerRef.current = setTimeout(() => {
        setSkippingUnavailable(false);
        handleNextTrackRef.current?.();
      }, 1500);
    }
  }, [createYTPlayer, stopYTProgressPoller]);

  // Play a random track from a view (for onboarding / first play without queue)
  const playRandomTrack = useCallback(() => {
    const view = activeViewRef.current;
    const entries = Array.from(cardRegistry.current.entries())
      .filter(([id]) => cardViewMap.current.get(id) === view);
    if (entries.length === 0) return;
    const [, card] = entries[Math.floor(Math.random() * entries.length)];
    buildQueue(card.id, true);
    handlePlayInternal(card);
  }, [handlePlayInternal, buildQueue]);

  // Prev track — walk queue index backward
  const handlePrevTrack = useCallback(() => {
    if (queueIndex.current <= 0) return;
    queueIndex.current--;
    const id = shuffleQueue.current[queueIndex.current];
    const card = cardRegistry.current.get(id);
    if (!card) return;
    playOriginView.current = cardViewMap.current.get(id) || null;
    handlePlayInternal(card);
  }, [handlePlayInternal]);

  // Next track — walk queue index forward
  const handleNextTrack = useCallback(() => {
    const queue = shuffleQueue.current;
    if (queue.length === 0) return;

    // Try to advance to next valid card
    let nextIdx = queueIndex.current + 1;
    while (nextIdx < queue.length) {
      const card = cardRegistry.current.get(queue[nextIdx]);
      if (card) {
        queueIndex.current = nextIdx;
        playOriginView.current = cardViewMap.current.get(card.id) || null;
        handlePlayInternal(card);
        return;
      }
      // Card was deregistered — skip it
      nextIdx++;
    }

    // Queue exhausted — rebuild and continue
    const currentId = nowPlayingCardRef.current?.id;
    const view = queueView.current || activeViewRef.current;
    const ids = Array.from(cardRegistry.current.entries())
      .filter(([id]) => cardViewMap.current.get(id) === view && id !== currentId)
      .map(([id]) => id);
    if (ids.length === 0) return;
    if (autoPlayEnabledRef.current) fisherYatesShuffle(ids);
    shuffleQueue.current = ids;
    queueIndex.current = 0;
    queueView.current = view;
    const card = cardRegistry.current.get(ids[0]);
    if (card) {
      playOriginView.current = cardViewMap.current.get(card.id) || null;
      handlePlayInternal(card);
    }
  }, [handlePlayInternal]);

  // Stable ref for handleNextTrack (used in YT callbacks)
  const handleNextTrackRef = useRef(handleNextTrack);
  handleNextTrackRef.current = handleNextTrack;

  const handleTogglePlay = useCallback(() => {
    if (isPlaying) {
      if (ytPlayerRef.current) {
        try { ytPlayerRef.current.pauseVideo(); } catch { /* ignore */ }
      }
      stopYTProgressPoller();
      setPlayingId(null);
      setIsPlaying(false);
    } else if (nowPlayingCard) {
      setPlayingId(nowPlayingCard.id);
      setIsPlaying(true);
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.playVideo();
          startYTProgressPoller();
        } catch { /* ignore */ }
      }
    }
  }, [isPlaying, nowPlayingCard, stopYTProgressPoller, startYTProgressPoller]);

  const handlePlay = useCallback((id: string) => {
    // If clicking the currently-playing card, toggle pause
    if (id === nowPlayingCardRef.current?.id) {
      handleTogglePlay();
      return;
    }
    const card = cardRegistry.current.get(id);
    if (!card) return;

    // Check if card is already in the current queue
    const existingIdx = shuffleQueue.current.indexOf(id);
    if (existingIdx !== -1) {
      // Jump to its position in the queue
      queueIndex.current = existingIdx;
    } else {
      // Different view or not in queue — build a new queue starting from this card
      buildQueue(id, autoPlayEnabledRef.current);
    }

    // Record which view the user played from (for locate)
    playOriginView.current = activeViewRef.current;
    handlePlayInternal(card);
  }, [handlePlayInternal, handleTogglePlay, buildQueue]);

  // Commit any pending unlike (soft-delete stays, just dismiss toast)
  const commitPendingUnlike = useCallback(() => {
    if (pendingUnlike.current) {
      clearTimeout(pendingUnlike.current.timer);
      pendingUnlike.current = null;
      setUndoToastVisible(false);
    }
  }, []);

  // Undo handler — restore the soft-deleted like
  const handleUndoUnlike = useCallback(() => {
    const pending = pendingUnlike.current;
    if (!pending) return;
    clearTimeout(pending.timer);
    pendingUnlike.current = null;
    setUndoToastVisible(false);

    // Restore in UI — card is still in grid, just remove from softDeletedIds
    setUndoRestoredId(pending.id);
    setTimeout(() => setUndoRestoredId(null), 100);
    setLikedIds((prev) => new Set(prev).add(pending.id));
    setSoftDeletedIds((prev) => {
      const next = new Set(prev);
      next.delete(pending.id);
      return next;
    });

    // Clear deleted_at in Supabase (restore the row)
    const email = session?.user?.email;
    if (email) {
      supabase
        .from("likes")
        .update({ deleted_at: null })
        .eq("user_email", email)
        .eq("video_id", pending.id)
        .then(({ error }) => {
          if (error) console.error("Failed to restore like:", error);
        });
    }
  }, [session?.user?.email]);

  // Restore a card from recently removed back to saved
  const handleRestoreRemoved = useCallback((id: string) => {
    const item = recentlyRemoved.find((c) => c.id === id);
    if (!item) return;
    // Move back to savedCards + likedIds
    const { deletedAt: _, ...card } = item;
    setUndoRestoredId(id);
    setTimeout(() => setUndoRestoredId(null), 100);
    setRecentlyRemoved((prev) => prev.filter((c) => c.id !== id));
    setSavedCards((prev) => [card, ...prev]);
    setLikedIds((prev) => new Set(prev).add(id));
    // Clear deleted_at in Supabase
    const email = session?.user?.email;
    if (email) {
      supabase.from("likes").update({ deleted_at: null }).eq("user_email", email).eq("video_id", id)
        .then(({ error }) => { if (error) console.error("Failed to restore like:", error); });
    }
  }, [recentlyRemoved, session?.user?.email]);

  // Hard delete — permanently remove from DB
  const handleHardDelete = useCallback((id: string) => {
    setRecentlyRemoved((prev) => prev.filter((c) => c.id !== id));
    const email = session?.user?.email;
    if (email) {
      supabase.from("likes").delete().eq("user_email", email).eq("video_id", id)
        .then(({ error }) => { if (error) console.error("Failed to hard-delete like:", error); });
    }
  }, [session?.user?.email]);

  // Clear all recently removed
  const handleClearAllRemoved = useCallback(() => {
    setRecentlyRemoved([]);
    const email = session?.user?.email;
    if (email) {
      supabase.from("likes").delete().eq("user_email", email).not("deleted_at", "is", null)
        .then(({ error }) => { if (error) console.error("Failed to clear removed:", error); });
    }
  }, [session?.user?.email]);

  const toggleLike = useCallback((id: string) => {
    const wasLiked = likedIds.has(id);
    const wasSoftDeleted = softDeletedIds.has(id);
    const card = cardRegistry.current.get(id)
      || savedCards.find((c) => c.id === id);

    // Optimistic local update
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (wasLiked) next.delete(id);
      else next.add(id);
      return next;
    });

    if (wasLiked) {
      // Card stays in grid — just add to softDeletedIds
      setSoftDeletedIds((prev) => new Set(prev).add(id));
    } else {
      // Re-liking a grace-period card — remove from softDeletedIds + cancel pending timer
      if (wasSoftDeleted) {
        setSoftDeletedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        if (pendingUnlike.current?.id === id) {
          clearTimeout(pendingUnlike.current.timer);
          pendingUnlike.current = null;
          setUndoToastVisible(false);
        }
      } else if (card) {
        // Fresh like — prepend to savedCards
        setSavedCards((prev) => [card, ...prev]);
      }
    }

    // Background Supabase sync
    const email = session?.user?.email;
    if (!email || !card) return;

    if (wasLiked) {
      // Commit any previous pending unlike first
      commitPendingUnlike();

      // Soft-delete: set deleted_at instead of DELETE
      supabase
        .from("likes")
        .update({ deleted_at: new Date().toISOString() })
        .eq("user_email", email)
        .eq("video_id", id)
        .then(({ error }) => {
          if (error) console.error("Failed to soft-delete like:", error);
        });

      // Show undo toast with 5s window — after expiry, move card to recently removed
      const deletedAt = new Date().toISOString();
      const timer = setTimeout(() => {
        if (pendingUnlike.current?.id !== id) return;
        pendingUnlike.current = null;
        setUndoToastVisible(false);
        // Move from main grid to recently removed
        setSavedCards((prev) => prev.filter((c) => c.id !== id));
        setSoftDeletedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
        if (card) setRecentlyRemoved((prev) => [{ ...card, deletedAt }, ...prev]);
      }, 5000);
      pendingUnlike.current = { id, card, timer };
      setUndoTrackName(card.name || "Track");
      setUndoToastVisible(true);
    } else {
      // Liking — upsert with deleted_at cleared (handles re-liking a soft-deleted row)
      supabase
        .from("likes")
        .upsert(
          { user_email: email, video_id: id, card_data: card, deleted_at: null },
          { onConflict: "user_email,video_id" }
        )
        .then(({ error }) => {
          if (error) console.error("Failed to upsert like:", error);
        });
    }
  }, [likedIds, softDeletedIds, session?.user?.email, commitPendingUnlike, savedCards]);

  const handleClosePlayer = useCallback(() => {
    stopYTProgressPoller();
    if (ytPlayerRef.current) {
      try { ytPlayerRef.current.stopVideo(); } catch { /* ignore */ }
    }
    setPlayingId(null);
    setIsPlaying(false);
    setNowPlayingCard(null);
    setAudioProgress(0);
    setAudioDuration(0);
    shuffleQueue.current = [];
    queueIndex.current = -1;
    queueView.current = null;
    setCanGoPrev(false);
    setShowQueue(false);
  }, [stopYTProgressPoller]);

  const handleClosePlayerRef = useRef(handleClosePlayer);
  handleClosePlayerRef.current = handleClosePlayer;

  const handleViewChange = useCallback((view: ViewType) => {
    scrollPositions.current[activeView] = window.scrollY;
    setActiveView(view);
    setMountedTabs((prev) => {
      if (prev.has(view)) return prev;
      const next = new Set(prev);
      next.add(view);
      return next;
    });
    requestAnimationFrame(() => {
      window.scrollTo(0, scrollPositions.current[view] || 0);
    });
  }, [activeView]);

  // Locate card — with 3s poll (30 × 100ms) + failure feedback
  const handleLocateCard = useCallback(() => {
    if (!nowPlayingCard || showOnboarding) return;
    document.dispatchEvent(new Event("locate-triggered"));

    const tryScroll = () => {
      const els = document.querySelectorAll(`[data-card-id="${nowPlayingCard.id}"]`);
      const el = Array.from(els).find(e => (e as HTMLElement).offsetParent !== null);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        const observer = new IntersectionObserver(([entry]) => {
          if (entry.isIntersecting) {
            observer.disconnect();
            el.classList.add("locate-highlight");
            setTimeout(() => el.classList.remove("locate-highlight"), 1800);
          }
        }, { threshold: 0.8 });
        observer.observe(el);
        setTimeout(() => observer.disconnect(), 3000);
        return true;
      }
      return false;
    };

    // Shake the locate button to signal failure
    const pulseLocateBtn = () => {
      const btn = document.querySelector(".locate-btn");
      if (btn) {
        btn.classList.add("locate-pulse");
        setTimeout(() => btn.classList.remove("locate-pulse"), 400);
      }
    };

    if (tryScroll()) return;

    const originView = playOriginView.current;
    const mapView = cardViewMap.current.get(nowPlayingCard.id);

    // Build list of views to try (deduped, excluding current)
    const viewsToTry: ViewType[] = [];
    if (originView && originView !== activeView) viewsToTry.push(originView);
    if (mapView && mapView !== activeView && mapView !== originView) viewsToTry.push(mapView);

    if (viewsToTry.length > 0) {
      let viewIdx = 0;
      const tryNextView = () => {
        if (viewIdx >= viewsToTry.length) {
          pulseLocateBtn();
          return;
        }
        setActiveView(viewsToTry[viewIdx]);
        let attempts = 0;
        const poll = setInterval(() => {
          attempts++;
          if (tryScroll()) {
            clearInterval(poll);
          } else if (attempts > 30) {
            clearInterval(poll);
            viewIdx++;
            tryNextView();
          }
        }, 100);
      };
      tryNextView();
    } else {
      pulseLocateBtn();
    }
  }, [nowPlayingCard, activeView, showOnboarding]);

  // Seek — uses YT.Player.seekTo() directly
  const handleSeek = useCallback((seconds: number) => {
    if (ytPlayerRef.current) {
      ytPlayerRef.current.seekTo(seconds, true);
      setAudioProgress(seconds);
    }
  }, []);

  // Volume control — throttled setState to avoid full page re-render on every pixel
  const volumeThrottleRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const handleVolumeChange = useCallback((newVolume: number) => {
    volumeRef.current = newVolume;
    if (ytPlayerRef.current) {
      try { ytPlayerRef.current.setVolume(newVolume); } catch { /* ignore */ }
    }
    if (newVolume > 0 && isMutedRef.current) {
      isMutedRef.current = false;
      setIsMuted(false);
      if (ytPlayerRef.current) try { ytPlayerRef.current.unMute(); } catch { /* ignore */ }
    }
    if (newVolume === 0 && !isMutedRef.current) {
      isMutedRef.current = true;
      setIsMuted(true);
      if (ytPlayerRef.current) try { ytPlayerRef.current.mute(); } catch { /* ignore */ }
    }
    // Throttled state + localStorage update (every 150ms instead of every pixel)
    if (!volumeThrottleRef.current) {
      volumeThrottleRef.current = setTimeout(() => {
        setVolume(volumeRef.current);
        localStorage.setItem("digeart-volume", String(volumeRef.current));
        volumeThrottleRef.current = undefined;
      }, 50);
    }
  }, []);

  // Commit volume immediately — called on drag end
  const handleVolumeCommit = useCallback((newVolume: number) => {
    if (volumeThrottleRef.current) { clearTimeout(volumeThrottleRef.current); volumeThrottleRef.current = undefined; }
    setVolume(newVolume);
    localStorage.setItem("digeart-volume", String(newVolume));
  }, []);

  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      if (ytPlayerRef.current) {
        try {
          if (next) ytPlayerRef.current.mute();
          else ytPlayerRef.current.unMute();
        } catch { /* ignore */ }
      }
      // Unmuting from 0 → restore to 50%
      if (!next && volume === 0) {
        const restored = 50;
        setVolume(restored);
        localStorage.setItem("digeart-volume", String(restored));
        if (ytPlayerRef.current) try { ytPlayerRef.current.setVolume(restored); } catch { /* ignore */ }
      }
      return next;
    });
  }, [volume]);

  const handlePlayQueueIndex = useCallback((index: number) => {
    const id = shuffleQueue.current[index];
    const card = cardRegistry.current.get(id);
    if (!card) return;
    queueIndex.current = index;
    playOriginView.current = cardViewMap.current.get(id) || null;
    handlePlayInternal(card);
  }, [handlePlayInternal]);

  const handleToggleAutoPlay = useCallback(() => {
    setAutoPlayEnabled((prev) => {
      const next = !prev;
      const currentIdx = queueIndex.current;
      const queue = shuffleQueue.current;

      if (currentIdx >= 0 && queue.length > 0) {
        // Preserve history (everything up to and including current track)
        const history = queue.slice(0, currentIdx + 1);
        const upcoming = queue.slice(currentIdx + 1);

        if (next) {
          // Shuffle on → randomize upcoming
          fisherYatesShuffle(upcoming);
        } else {
          // Shuffle off → sort upcoming by registry insertion order
          const registryOrder = Array.from(cardRegistry.current.keys());
          upcoming.sort((a, b) => registryOrder.indexOf(a) - registryOrder.indexOf(b));
        }

        shuffleQueue.current = [...history, ...upcoming];
        // queueIndex stays the same — history preserved
      }

      return next;
    });
  }, []);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return;

      switch (e.key) {
        case " ":
          e.preventDefault();
          if (nowPlayingCard) handleTogglePlay();
          break;
        case "ArrowRight":
          e.preventDefault();
          if (nowPlayingCard) handleNextTrack();
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (nowPlayingCard && canGoPrev) handlePrevTrack();
          break;
        case "n":
        case "N":
          if (nowPlayingCard) handleNextTrack();
          break;
        case "p":
        case "P":
          if (nowPlayingCard && canGoPrev) handlePrevTrack();
          break;
        case "s":
        case "S":
          if (nowPlayingCard) handleToggleAutoPlay();
          break;
        case "m":
        case "M":
          if (nowPlayingCard) handleToggleMute();
          break;
        case "l":
        case "L":
          if (nowPlayingCard) handleLocateCard();
          break;
        case "f":
        case "F":
          if (document.fullscreenElement) {
            document.exitFullscreen();
          } else {
            document.documentElement.requestFullscreen();
          }
          break;
        case "1":
          handleViewChange("home");
          break;
        case "2":
          handleViewChange("samples");
          break;
        case "3":
          handleViewChange("mixes");
          break;
        case "4":
          handleViewChange("saved");
          break;
        case "?":
          setShowAbout((v) => !v);
          break;
        case "+":
        case "=":
          if (nowPlayingCard) handleVolumeChange(Math.min(100, volume + 5));
          break;
        case "-":
          if (nowPlayingCard) handleVolumeChange(Math.max(0, volume - 5));
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nowPlayingCard, handleTogglePlay, handleNextTrack, handlePrevTrack, handleToggleAutoPlay, canGoPrev, handleToggleMute, handleLocateCard, handleViewChange, volume, handleVolumeChange]);

  const hasPlayer = !!nowPlayingCard;

  return (
    <main
      className="layout-shift min-h-screen bg-[var(--bg)] min-[1152px]:ml-[var(--sidebar-width)]"
      data-player={hasPlayer ? "true" : "false"}
    >
      {/* Hidden YT Player container */}
      <div
        ref={ytContainerRef}
        className="fixed w-px h-px opacity-0 pointer-events-none"
        style={{ top: 0, left: 0 }}
      />

      <Sidebar
        activeView={activeView}
        onViewChange={handleViewChange}
        activeGenre={activeGenre}
        onGenreChange={setActiveGenre}
        activeTagFilters={activeTagFilters}
        onTagFiltersChange={setActiveTagFilters}
        activeGenreLabels={activeGenreLabels}
        onGenreLabelsChange={setActiveGenreLabels}
        showAbout={showAbout}
        onToggleAbout={() => setShowAbout((v) => !v)}
        onRunTutorial={() => { setShowAbout(false); setShowOnboarding(true); }}
      />

      <div style={{ display: activeView === "home" ? undefined : "none" }}>
        <DiscoverGrid
          savedIds={likedIds}
          likedIds={likedIds}
          playingId={playingId}
          isPlaying={isPlaying}
          onPlay={handlePlay}
          onToggleSave={toggleLike}
          onToggleLike={toggleLike}
          activeGenre={activeGenre}
          activeTagFilters={activeTagFilters}
          activeGenreLabels={activeGenreLabels}
          onCardsLoaded={registerHomeCards}
          isAuthenticated={isAuthenticated}
        />
      </div>

      <div style={{ display: activeView === "samples" ? undefined : "none" }}>
        {mountedTabs.has("samples") && (
          <SamplesGrid
            savedIds={likedIds}
            likedIds={likedIds}
            playingId={playingId}
            isPlaying={isPlaying}
            onPlay={handlePlay}
            onToggleSave={toggleLike}
            onToggleLike={toggleLike}
            activeTagFilters={activeTagFilters}
            activeGenreLabels={activeGenreLabels}
            onCardsLoaded={registerSamplesCards}
            isAuthenticated={isAuthenticated}
          />
        )}
      </div>

      <div style={{ display: activeView === "mixes" ? undefined : "none" }}>
        {mountedTabs.has("mixes") && (
          <MixesGrid
            savedIds={likedIds}
            likedIds={likedIds}
            playingId={playingId}
            isPlaying={isPlaying}
            onPlay={handlePlay}
            onToggleSave={toggleLike}
            onToggleLike={toggleLike}
            activeTagFilters={activeTagFilters}
            activeGenreLabels={activeGenreLabels}
            onCardsLoaded={registerMixesCards}
            isAuthenticated={isAuthenticated}
          />
        )}
      </div>

      <div style={{ display: activeView === "saved" ? undefined : "none" }}>
        <SavedGrid
          cards={savedCards}
          loading={savedLoading}
          likedIds={likedIds}
          softDeletedIds={softDeletedIds}
          playingId={playingId}
          isPlaying={isPlaying}
          onPlay={handlePlay}
          onToggleLike={toggleLike}
          activeTagFilters={activeTagFilters}
          isAuthenticated={isAuthenticated}
          onCardsLoaded={registerSavedCards}
          recentlyRemoved={recentlyRemoved}
          onRestoreRemoved={handleRestoreRemoved}
          onHardDelete={handleHardDelete}
          onClearAllRemoved={handleClearAllRemoved}
        />
      </div>

      <UndoToast visible={undoToastVisible} onUndo={handleUndoUnlike} trackName={undoTrackName} />


      <AnimatePresence>
        {nowPlayingCard && (
          <NowPlayingBanner
            key="player"
            card={nowPlayingCard}
            isPlaying={isPlaying}
            isUnavailable={skippingUnavailable}
            onTogglePlay={handleTogglePlay}
            onClose={handleClosePlayer}
            onLocate={handleLocateCard}
            onPrevTrack={handlePrevTrack}
            onNextTrack={handleNextTrack}
            hasPrev={canGoPrev}
            audioProgress={audioProgress}
            audioDuration={audioDuration}
            onSeek={handleSeek}
            autoPlay={autoPlayEnabled}
            onToggleAutoPlay={handleToggleAutoPlay}
            volume={volume}
            isMuted={isMuted}
            onVolumeChange={handleVolumeChange}
            onVolumeCommit={handleVolumeCommit}
            onToggleMute={handleToggleMute}
            isLiked={likedIds.has(nowPlayingCard.id)}
            onToggleLike={() => toggleLike(nowPlayingCard.id)}
            isAuthenticated={isAuthenticated}
            showQueue={showQueue}
            onToggleQueue={() => setShowQueue((v) => !v)}
            undoRestoredId={undoRestoredId}
          />
        )}
      </AnimatePresence>

      <QueuePanel
        isOpen={showQueue}
        onClose={() => setShowQueue(false)}
        queue={shuffleQueue.current}
        currentIndex={queueIndex.current}
        cardRegistry={cardRegistry.current}
        onPlayIndex={handlePlayQueueIndex}
      />

      <WelcomeScreen show={showWelcome} onDismiss={handleWelcomeDismiss} />
      <OnboardingOverlay show={showOnboarding} onComplete={handleOnboardingComplete} onPlayRandom={playRandomTrack} />
    </main>
  );
}

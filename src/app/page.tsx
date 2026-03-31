"use client";

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
  const [activeTagFilter, setActiveTagFilter] = useState<"all" | "hot" | "rare" | "new">("all");
  const [activeGenreLabel, setActiveGenreLabel] = useState<string | null>(null);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [nowPlayingCard, setNowPlayingCard] = useState<CardData | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(true);
  const [historyLength, setHistoryLength] = useState(0);
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
  const [showAbout, setShowAbout] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Undo unlike state
  const [undoToastVisible, setUndoToastVisible] = useState(false);
  const pendingUnlike = useRef<{ id: string; card: CardData; timer: ReturnType<typeof setTimeout> } | null>(null);

  const skippingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cardRegistry = useRef<Map<string, CardData>>(new Map());
  const cardViewMap = useRef<Map<string, ViewType>>(new Map());
  const playOriginView = useRef<ViewType | null>(null);
  const activeViewRef = useRef(activeView);
  activeViewRef.current = activeView;
  const playHistory = useRef<CardData[]>([]);
  const playForwardStack = useRef<CardData[]>([]);
  // YT IFrame API refs
  const ytPlayerRef = useRef<YTPlayer | null>(null);
  const ytContainerRef = useRef<HTMLDivElement | null>(null);
  const ytApiReady = useRef(false);
  const ytPendingVideoId = useRef<string | null>(null);
  const ytProgressInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasAdvancedRef = useRef(false);

  // ── Load YouTube IFrame API script ──
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.YT && window.YT.Player) {
      ytApiReady.current = true;
      return;
    }
    // Set callback before loading script
    window.onYouTubeIframeAPIReady = () => {
      ytApiReady.current = true;
      // If there's a pending video, play it now
      if (ytPendingVideoId.current) {
        createYTPlayer(ytPendingVideoId.current);
        ytPendingVideoId.current = null;
      }
    };
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
      .or("deleted_at.is.null,deleted_at.gte." + new Date(Date.now() - 30 * 86400000).toISOString())
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error("Failed to load likes:", error);
          setSavedLoading(false);
          return;
        }
        const ids = new Set<string>();
        const softDeleted = new Set<string>();
        const cards: CardData[] = [];
        for (const row of data || []) {
          cards.push(row.card_data as CardData);
          if (row.deleted_at === null) {
            ids.add(row.video_id);
          } else {
            softDeleted.add(row.video_id);
          }
        }
        setLikedIds(ids);
        setSoftDeletedIds(softDeleted);
        setSavedCards(cards);
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
    hasAdvancedRef.current = false;
    ytProgressInterval.current = setInterval(() => {
      const p = ytPlayerRef.current;
      if (!p) return;
      try {
        const current = p.getCurrentTime();
        const duration = p.getDuration();
        const state = p.getPlayerState();
        // Only update progress state when playing (state 1) — avoids unnecessary re-renders when paused
        if (state === 1) {
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
    if (!ytApiReady.current || !ytContainerRef.current) return;

    // Reuse existing player — keeps the iframe + postMessage channel alive
    if (ytPlayerRef.current) {
      hasAdvancedRef.current = false;
      ytPlayerRef.current.loadVideoById(videoId);
      startYTProgressPoller();
      return;
    }

    // First time: create the player and iframe
    const div = document.createElement("div");
    div.id = "yt-player-target";
    ytContainerRef.current.innerHTML = "";
    ytContainerRef.current.appendChild(div);

    ytPlayerRef.current = new window.YT.Player("yt-player-target", {
      height: "1",
      width: "1",
      videoId,
      playerVars: {
        autoplay: 1,
        controls: 0,
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
        rel: 0,
        playsinline: 1,
      },
      events: {
        onReady: (event: YTPlayerEvent) => {
          // iOS Safari: must start muted for autoplay policy
          event.target.mute();
          event.target.playVideo();
          setTimeout(() => {
            event.target.setVolume(volumeRef.current);
            if (!isMutedRef.current) event.target.unMute();
          }, 300);
          startYTProgressPoller();
        },
        onStateChange: (event: YTPlayerEvent) => {
          handleYTStateChange.current?.(event);
        },
        onError: () => {
          // Show unavailable feedback, then auto-advance
          setSkippingUnavailable(true);
          if (skippingTimerRef.current) clearTimeout(skippingTimerRef.current);
          skippingTimerRef.current = setTimeout(() => {
            setSkippingUnavailable(false);
            handleNextTrackRef.current?.();
          }, 1500);
        },
      },
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
        // PLAYING
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
    for (const c of cards) {
      cardRegistry.current.set(c.id, c);
      // Don't let the saved view overwrite a card's real origin
      if (view !== "saved" || !cardViewMap.current.has(c.id)) {
        cardViewMap.current.set(c.id, view);
      }
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


  // Internal play handler
  const handlePlayInternal = useCallback((card: CardData, skipHistory = false) => {
    if (!skipHistory) {
      setNowPlayingCard((prev) => {
        if (prev) {
          playHistory.current.push(prev);
          setHistoryLength(playHistory.current.length);
        }
        return prev;
      });
      // Clear forward stack on manual track selection
      playForwardStack.current = [];
    }
    setPlayingId(card.id);
    setIsPlaying(true);
    setAudioProgress(0);
    setAudioDuration(card.duration || 0);
    setNowPlayingCard(card);

    // Update origin view so locate points to the card's actual view
    if (skipHistory) {
      playOriginView.current = cardViewMap.current.get(card.id) || null;
    }

    if (card.source === "youtube" && card.videoId) {
      if (ytApiReady.current) {
        createYTPlayer(card.videoId);
      } else {
        ytPendingVideoId.current = card.videoId;
      }
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

  // Play random track — scoped to the current active view
  const playRandomTrack = useCallback(() => {
    const currentView = nowPlayingCardRef.current?.id
      ? (cardViewMap.current.get(nowPlayingCardRef.current.id) || activeViewRef.current)
      : activeViewRef.current;
    const entries = Array.from(cardRegistry.current.entries());
    const candidates = entries.filter(
      ([id]) => id !== nowPlayingCardRef.current?.id && cardViewMap.current.get(id) === currentView
    );
    if (candidates.length === 0) return;
    const [, card] = candidates[Math.floor(Math.random() * candidates.length)];
    handlePlayInternal(card);
  }, [handlePlayInternal]);

  // Play next sequential
  const playNextSequential = useCallback(() => {
    const current = nowPlayingCardRef.current;
    if (!current) return;
    const currentView = cardViewMap.current.get(current.id);
    if (!currentView) {
      playRandomTrack();
      return;
    }
    const viewEntries = Array.from(cardRegistry.current.entries()).filter(
      ([id]) => cardViewMap.current.get(id) === currentView
    );
    const currentIndex = viewEntries.findIndex(([id]) => id === current.id);
    if (currentIndex === -1 || viewEntries.length === 0) {
      playRandomTrack();
      return;
    }
    const nextIndex = (currentIndex + 1) % viewEntries.length;
    if (nextIndex === currentIndex) {
      // Only one track in view — stop instead of replaying
      return;
    }
    const [, nextCard] = viewEntries[nextIndex];
    handlePlayInternal(nextCard);
  }, [handlePlayInternal, playRandomTrack]);

  // Prev track (with forward stack)
  const handlePrevTrack = useCallback(() => {
    const prev = playHistory.current.pop();
    setHistoryLength(playHistory.current.length);
    if (!prev) return;
    // Push current to forward stack before going back
    if (nowPlayingCardRef.current) {
      playForwardStack.current.push(nowPlayingCardRef.current);
    }
    handlePlayInternal(prev, true);
  }, [handlePlayInternal]);

  // Next track (with forward stack support)
  const handleNextTrack = useCallback(() => {
    // If forward stack has entries (came back), use those first
    if (playForwardStack.current.length > 0) {
      const next = playForwardStack.current.pop()!;
      // Push current to history
      if (nowPlayingCardRef.current) {
        playHistory.current.push(nowPlayingCardRef.current);
        setHistoryLength(playHistory.current.length);
      }
      handlePlayInternal(next, true);
      return;
    }
    if (autoPlayEnabledRef.current) {
      playRandomTrack();
    } else {
      playNextSequential();
    }
  }, [playRandomTrack, playNextSequential, handlePlayInternal]);

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
    // Manual selection clears forward stack
    playForwardStack.current = [];
    // Record which view the user played from (for locate)
    playOriginView.current = activeViewRef.current;
    handlePlayInternal(card);
  }, [handlePlayInternal, handleTogglePlay]);

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
      // Re-liking a grace-period card — remove from softDeletedIds
      if (wasSoftDeleted) {
        setSoftDeletedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
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

      // Show undo toast with 5s window
      const timer = setTimeout(() => {
        pendingUnlike.current = null;
        setUndoToastVisible(false);
      }, 5000);
      pendingUnlike.current = { id, card, timer };
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
  }, [stopYTProgressPoller]);

  const handleClosePlayerRef = useRef(handleClosePlayer);
  handleClosePlayerRef.current = handleClosePlayer;

  const handleViewChange = useCallback((view: ViewType) => {
    setActiveView(view);
  }, []);

  // Locate card — with 3s poll (30 × 100ms) + failure feedback
  const handleLocateCard = useCallback(() => {
    if (!nowPlayingCard) return;
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
  }, [nowPlayingCard, activeView]);

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

  const handleToggleAutoPlay = useCallback(() => {
    setAutoPlayEnabled((prev) => !prev);
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
          if (nowPlayingCard && historyLength > 0) handlePrevTrack();
          break;
        case "n":
        case "N":
          if (nowPlayingCard) handleNextTrack();
          break;
        case "p":
        case "P":
          if (nowPlayingCard && historyLength > 0) handlePrevTrack();
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
  }, [nowPlayingCard, handleTogglePlay, handleNextTrack, handlePrevTrack, handleToggleAutoPlay, historyLength, handleToggleMute, handleLocateCard, handleViewChange, volume, handleVolumeChange]);

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
        activeTagFilter={activeTagFilter}
        onTagFilterChange={setActiveTagFilter}
        activeGenreLabel={activeGenreLabel}
        onGenreLabelChange={setActiveGenreLabel}
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
          activeTagFilter={activeTagFilter}
          activeGenreLabel={activeGenreLabel}
          onCardsLoaded={registerHomeCards}
          isAuthenticated={isAuthenticated}
        />
      </div>

      <div style={{ display: activeView === "samples" ? undefined : "none" }}>
        <SamplesGrid
          savedIds={likedIds}
          likedIds={likedIds}
          playingId={playingId}
          isPlaying={isPlaying}
          onPlay={handlePlay}
          onToggleSave={toggleLike}
          onToggleLike={toggleLike}
          activeTagFilter={activeTagFilter}
          activeGenreLabel={activeGenreLabel}
          onCardsLoaded={registerSamplesCards}
          isAuthenticated={isAuthenticated}
        />
      </div>

      <div style={{ display: activeView === "mixes" ? undefined : "none" }}>
        <MixesGrid
          savedIds={likedIds}
          likedIds={likedIds}
          playingId={playingId}
          isPlaying={isPlaying}
          onPlay={handlePlay}
          onToggleSave={toggleLike}
          onToggleLike={toggleLike}
          activeTagFilter={activeTagFilter}
          activeGenreLabel={activeGenreLabel}
          onCardsLoaded={registerMixesCards}
          isAuthenticated={isAuthenticated}
        />
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
          activeTagFilter={activeTagFilter}
          isAuthenticated={isAuthenticated}
          onCardsLoaded={registerSavedCards}
        />
      </div>

      <UndoToast visible={undoToastVisible} onUndo={handleUndoUnlike} />


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
            hasPrev={historyLength > 0}
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
          />
        )}
      </AnimatePresence>

      <WelcomeScreen show={showWelcome} onDismiss={handleWelcomeDismiss} />
      <OnboardingOverlay show={showOnboarding} onComplete={handleOnboardingComplete} onPlayRandom={playRandomTrack} />
    </main>
  );
}

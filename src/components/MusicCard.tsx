"use client";

import { useState } from "react";
import Image from "next/image";
import type { CardData } from "@/lib/types";

interface MusicCardProps {
  card: CardData;
  liked?: boolean;
  saved: boolean;
  isPlaying: boolean;
  isTop10?: boolean;
  onPlay: () => void;
  onLike?: () => void;
  onSave: () => void;
  onShare?: () => void;
}

function formatViewCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(0)}K`;
  return String(count);
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function MusicCard({
  card,
  saved,
  isPlaying,
  isTop10 = false,
  onPlay,
  onSave,
}: MusicCardProps) {
  const [imgError, setImgError] = useState(false);


  const handlePlay = () => {
    if (card.source === "youtube" && card.videoId) {
      onPlay();
      return;
    }

    if (!card.previewUrl) {
      if (card.spotifyUrl) window.open(card.spotifyUrl, "_blank");
      return;
    }

    // Spotify preview — parent handles audio
    onPlay();
  };

  return (
    <div data-card-id={card.id} className={`group relative aspect-square overflow-hidden cursor-pointer bg-[var(--bg-alt)] rounded-md transition-all duration-200 hover:ring-1 hover:ring-[var(--text-muted)]/20`} style={{ isolation: "isolate" }}>
      {/* Cover image or fallback */}
      {imgError ? (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--bg-alt)]"
          onClick={handlePlay}
        >
          <svg className="w-10 h-10 text-[var(--text-muted)] mb-2" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.34A1 1 0 0017.93 1.4L9.428 3.97A1 1 0 008.5 4.93V14" />
          </svg>
          <span className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-widest">DIGEART</span>
        </div>
      ) : (
        <Image
          src={card.image || "/placeholder.svg"}
          alt={`${card.name} by ${card.artist}`}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          onClick={handlePlay}
          onError={() => setImgError(true)}
        />
      )}

      {/* Duration badge — top left (for mixes >40min) */}
      {card.duration && card.duration > 2400 && (
        <span className="absolute top-2 left-2 z-10 px-2 py-0.5 bg-black/70 text-white font-mono text-[10px] rounded-md backdrop-blur-sm">
          {formatDuration(card.duration)}
        </span>
      )}

      {/* View count badge — top right */}
      {card.viewCount != null && card.viewCount > 0 && (
        <span className={`absolute top-2 right-2 z-10 px-2 py-0.5 font-mono text-[10px] rounded-md ${
          isTop10
            ? "bg-orange-500 text-white font-bold shadow-sm"
            : "bg-black/70 text-white backdrop-blur-sm"
        }`}>
          {card.source === "spotify" ? `Pop ${card.viewCount}` : formatViewCount(card.viewCount)}
        </span>
      )}

      {/* Center EQ — always visible when playing, hidden on hover (stop button takes over) */}
      {isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none group-hover:opacity-0 transition-opacity duration-200">
          <div className="flex items-end gap-[3px] bg-black/60 rounded-lg px-3 py-2 h-10 backdrop-blur-sm">
            <span className="w-[3px] bg-white eq-bar rounded-full" style={{ animationDelay: "0ms" }} />
            <span className="w-[3px] bg-white eq-bar rounded-full" style={{ animationDelay: "150ms" }} />
            <span className="w-[3px] bg-white eq-bar rounded-full" style={{ animationDelay: "300ms" }} />
            <span className="w-[3px] bg-white eq-bar rounded-full" style={{ animationDelay: "100ms" }} />
            <span className="w-[3px] bg-white eq-bar rounded-full" style={{ animationDelay: "220ms" }} />
          </div>
        </div>
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />

      {/* Play/Stop button — center, on hover */}
      <div
        className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        onClick={handlePlay}
      >
        <span
          className={`font-mono text-6xl sm:text-7xl lg:text-8xl leading-none transition-colors drop-shadow-[0_0_20px_rgba(0,0,0,0.8)] ${
            isPlaying ? "text-white" : "text-white hover:text-zinc-300"
          }`}
        >
          {isPlaying ? "■" : "▶"}
        </span>
      </div>

      {/* Save button — bottom right */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onSave();
        }}
        className={`absolute bottom-2 right-2 w-11 h-11 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 bg-black/70 text-white hover:bg-black/90`}
      >
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth={saved ? 0 : 2}>
          {saved ? (
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          )}
        </svg>
      </button>


      {/* Track info — bottom */}
      <div className="absolute bottom-0 left-0 right-[48px] px-2.5 py-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <p className="font-mono text-sm text-white uppercase truncate leading-tight font-bold drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
            {card.name}
          </p>
          <p className="font-mono text-[11px] text-zinc-300 uppercase truncate drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
            {card.artist}
          </p>
        </div>
    </div>
  );
}

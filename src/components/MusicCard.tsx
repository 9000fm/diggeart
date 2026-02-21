"use client";

import { useRef, useState, useEffect } from "react";
import Image from "next/image";
import type { CardData } from "@/lib/types";

interface MusicCardProps {
  card: CardData;
  liked?: boolean;
  saved: boolean;
  isPlaying: boolean;
  onPlay: () => void;
  onLike?: () => void;
  onSave: () => void;
  onShare?: () => void;
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
  onPlay,
  onSave,
}: MusicCardProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [embedded, setEmbedded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    if (!isPlaying) {
      if (audioRef.current && audioPlaying) {
        audioRef.current.pause();
        setAudioPlaying(false);
      }
      if (embedded) {
        setEmbedded(false);
      }
    }
  }, [isPlaying]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePlay = () => {
    onPlay();

    if (card.source === "youtube" && card.videoId) {
      setEmbedded(true);
      return;
    }

    if (!card.previewUrl) {
      if (card.spotifyUrl) window.open(card.spotifyUrl, "_blank");
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;

    if (audioPlaying) {
      audio.pause();
      setAudioPlaying(false);
    } else {
      audio.play();
      setAudioPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (audio && audio.duration) {
      setProgress((audio.currentTime / audio.duration) * 100);
    }
  };

  // YouTube inline embed with age-restricted fallback
  if (embedded && card.videoId) {
    return (
      <div className="relative aspect-square bg-black rounded-lg overflow-hidden">
        <iframe
          src={`https://www.youtube.com/embed/${card.videoId}?autoplay=1&rel=0`}
          allow="autoplay; encrypted-media"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
        />
        {/* Controls overlay */}
        <div className="absolute top-2 right-2 z-10 flex gap-1.5">
          <a
            href={`https://www.youtube.com/watch?v=${card.videoId}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="w-8 h-8 bg-black/70 rounded-full text-white flex items-center justify-center font-mono text-xs hover:bg-black/90 transition-colors"
            title="Watch on YouTube"
          >
            YT
          </a>
          <button
            onClick={() => setEmbedded(false)}
            className="w-8 h-8 bg-black/70 rounded-full text-white flex items-center justify-center font-mono text-sm hover:bg-black/90 transition-colors"
          >
            X
          </button>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSave();
          }}
          className={`absolute bottom-2 right-2 z-10 w-8 h-8 rounded-full flex items-center justify-center font-mono text-sm transition-colors ${
            saved
              ? "bg-white text-black"
              : "bg-black/70 text-white hover:bg-black/90"
          }`}
        >
          {saved ? "★" : "☆"}
        </button>
      </div>
    );
  }

  return (
    <div className="group relative aspect-square overflow-hidden cursor-pointer bg-[var(--bg-alt)] rounded-lg transition-all duration-200 hover:ring-1 hover:ring-[var(--text-muted)]/20">
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

      {/* Duration badge — top left (for mixes >50min) */}
      {card.duration && card.duration > 3000 && (
        <span className="absolute top-2 left-2 z-10 px-2 py-0.5 bg-black/70 text-white font-mono text-[10px] rounded-md backdrop-blur-sm">
          {formatDuration(card.duration)}
        </span>
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />

      {/* Play button — center */}
      <div
        className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        onClick={handlePlay}
      >
        <span
          className={`font-mono text-[11rem] leading-none transition-colors drop-shadow-[0_0_30px_rgba(0,0,0,0.8)] ${
            audioPlaying ? "text-white" : "text-white hover:text-zinc-300"
          }`}
        >
          {audioPlaying ? "■" : "▶"}
        </span>
      </div>

      {/* Save button — bottom right */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onSave();
        }}
        className={`absolute bottom-2 right-2 w-11 h-11 rounded-full flex items-center justify-center font-mono text-lg opacity-0 group-hover:opacity-100 transition-all duration-200 ${
          saved
            ? "bg-white text-black"
            : "bg-black/70 text-white hover:bg-black/90"
        }`}
      >
        {saved ? "★" : "☆"}
      </button>

      {/* Info button — bottom left */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowInfo(!showInfo);
        }}
        className="absolute bottom-2 left-2 w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs bg-black/70 text-white hover:bg-black/90 opacity-0 group-hover:opacity-100 transition-all duration-200"
      >
        i
      </button>

      {/* Info overlay */}
      {showInfo && (
        <div
          className="absolute inset-0 z-20 bg-black/80 backdrop-blur-sm flex flex-col justify-end p-3"
          onClick={(e) => {
            e.stopPropagation();
            setShowInfo(false);
          }}
        >
          <p className="font-mono text-sm text-white uppercase truncate leading-tight font-bold">
            {card.name}
          </p>
          <p className="font-mono text-[11px] text-zinc-300 uppercase truncate mt-0.5">
            {card.artist}
          </p>
          {card.album && card.album !== card.artist && (
            <p className="font-mono text-[10px] text-zinc-400 uppercase truncate mt-0.5">
              {card.album}
            </p>
          )}
          <p className="font-mono text-[10px] text-zinc-500 uppercase mt-1">
            {card.source === "youtube" ? "YouTube" : "Spotify"}
            {card.duration && card.duration > 60 ? ` — ${formatDuration(card.duration)}` : ""}
          </p>
        </div>
      )}

      {/* Track info — bottom */}
      {!showInfo && (
        <div className="absolute bottom-0 left-0 right-[48px] px-2.5 py-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <p className="font-mono text-sm text-white uppercase truncate leading-tight font-bold drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
            {card.name}
          </p>
          <p className="font-mono text-[11px] text-zinc-300 uppercase truncate drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
            {card.artist}
          </p>
        </div>
      )}

      {/* Audio progress bar */}
      {audioPlaying && (
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-black/30">
          <div
            className="h-full bg-white transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Audio element */}
      {card.previewUrl && (
        <audio
          ref={audioRef}
          src={card.previewUrl}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => {
            setAudioPlaying(false);
            setProgress(0);
          }}
          preload="none"
        />
      )}
    </div>
  );
}

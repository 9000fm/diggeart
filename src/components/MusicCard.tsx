"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { keyName } from "@/lib/spotify";

export interface CardData {
  id: string;
  name: string;
  artist: string;
  album: string;
  image: string;
  imageSmall: string;
  previewUrl: string | null;
  spotifyUrl: string;
  uri: string;
  bpm: number | null;
  energy: number | null;
  danceability: number | null;
  valence: number | null;
  key: number | null;
}

function EnergyBar({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
      <span className="w-7 shrink-0">{label}</span>
      <div className="h-1 flex-1 rounded-full bg-zinc-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="w-6 text-right tabular-nums">{value}%</span>
    </div>
  );
}

interface MusicCardProps {
  card: CardData;
  liked: boolean;
  saved: boolean;
  onLike: () => void;
  onSave: () => void;
  onShare: () => void;
}

export default function MusicCard({ card, liked, saved, onLike, onSave, onShare }: MusicCardProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showActions, setShowActions] = useState(false);

  const togglePlay = () => {
    if (!card.previewUrl) {
      window.open(card.spotifyUrl, "_blank");
      return;
    }
    const audio = audioRef.current;
    if (!audio) return;

    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play();
      setPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (audio && audio.duration) {
      setProgress((audio.currentTime / audio.duration) * 100);
    }
  };

  return (
    <div
      className="group relative rounded-2xl bg-zinc-900/80 border border-zinc-800/50 overflow-hidden hover:border-zinc-700/80 transition-all duration-300 hover:shadow-2xl hover:shadow-amber-500/5 hover:-translate-y-1"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Album Art */}
      <div className="relative aspect-square cursor-pointer" onClick={togglePlay}>
        <Image
          src={card.image || "/placeholder.svg"}
          alt={`${card.name} by ${card.artist}`}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
        />
        {/* Play overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all duration-300">
            {card.previewUrl ? (
              <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 ${
                playing
                  ? "bg-white shadow-white/20 scale-95"
                  : "bg-amber-500 shadow-amber-500/30 hover:scale-110"
              }`}>
                {playing ? (
                  <svg className="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="4" width="4" height="16" rx="1" />
                    <rect x="14" y="4" width="4" height="16" rx="1" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-black ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </div>
            ) : (
              <div className="w-14 h-14 rounded-full bg-zinc-700 flex items-center justify-center hover:scale-110 transition-transform">
                <svg className="w-5 h-5 text-zinc-300" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                </svg>
              </div>
            )}
          </div>
        </div>
        {/* Progress bar */}
        {playing && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-800/80">
            <div
              className="h-full bg-amber-500 transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Action buttons — like/save/share */}
      <div className={`absolute top-2 right-2 flex flex-col gap-1.5 transition-all duration-200 ${
        showActions ? "opacity-100 translate-x-0" : "opacity-0 translate-x-2"
      }`}>
        <button
          onClick={(e) => { e.stopPropagation(); onLike(); }}
          className={`w-8 h-8 rounded-full backdrop-blur-md flex items-center justify-center transition-all duration-200 hover:scale-110 ${
            liked ? "bg-red-500 text-white" : "bg-black/60 text-zinc-300 hover:text-white"
          }`}
          title="Like"
        >
          <svg className="w-4 h-4" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onSave(); }}
          className={`w-8 h-8 rounded-full backdrop-blur-md flex items-center justify-center transition-all duration-200 hover:scale-110 ${
            saved ? "bg-amber-500 text-black" : "bg-black/60 text-zinc-300 hover:text-white"
          }`}
          title="Save to crate"
        >
          <svg className="w-4 h-4" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
          </svg>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onShare(); }}
          className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md text-zinc-300 hover:text-white flex items-center justify-center transition-all duration-200 hover:scale-110"
          title="Share"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
          </svg>
        </button>
      </div>

      {/* Info */}
      <div className="p-3.5 space-y-2">
        <div>
          <h3 className="font-semibold text-sm text-white truncate leading-tight">
            {card.name}
          </h3>
          <p className="text-xs text-zinc-400 truncate mt-0.5">{card.artist}</p>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {card.bpm && (
            <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-[10px] text-zinc-300 font-medium tabular-nums">
              {card.bpm} BPM
            </span>
          )}
          {card.key !== null && card.key >= 0 && (
            <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-[10px] text-zinc-300 font-medium">
              {keyName(card.key)}
            </span>
          )}
        </div>

        {/* Energy bars */}
        {card.energy !== null && (
          <div className="space-y-1 pt-1">
            <EnergyBar value={card.energy!} label="NRG" color="bg-gradient-to-r from-amber-500 to-orange-400" />
            <EnergyBar value={card.danceability!} label="DNC" color="bg-gradient-to-r from-emerald-500 to-emerald-300" />
            <EnergyBar value={card.valence!} label="VIB" color="bg-gradient-to-r from-violet-500 to-purple-300" />
          </div>
        )}
      </div>

      {/* Audio element */}
      {card.previewUrl && (
        <audio
          ref={audioRef}
          src={card.previewUrl}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => {
            setPlaying(false);
            setProgress(0);
          }}
          preload="none"
        />
      )}
    </div>
  );
}

"use client";

import type { Upload } from "../types";

interface ChannelUploadGridProps {
  uploads: Upload[];
  playingVideoId: string | null;
  setPlayingVideoId: (id: string | null) => void;
  loading?: boolean;
}

function ViewCount({ count }: { count: number }) {
  const formatted =
    count >= 1_000_000
      ? `${(count / 1_000_000).toFixed(1)}M`
      : count >= 1_000
        ? `${(count / 1_000).toFixed(0)}K`
        : count;
  return (
    <span className="absolute top-1.5 right-1.5 z-10 px-1.5 py-0.5 bg-black/70 text-white font-mono text-[9px] rounded-sm backdrop-blur-sm inline-flex items-center gap-1">
      <svg
        className="w-2.5 h-2.5 opacity-70"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
      >
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
      {formatted}
    </span>
  );
}

export function ChannelUploadGrid({
  uploads,
  playingVideoId,
  setPlayingVideoId,
  loading,
}: ChannelUploadGridProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="animate-pulse text-[var(--text-muted)]">
          LOADING UPLOADS...
        </span>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-1.5">
        {uploads.map((upload) => (
          <div
            key={upload.id}
            className="rounded-lg overflow-hidden bg-[var(--bg-alt)]"
          >
            {playingVideoId === upload.id ? (
              <div>
                <div className="relative w-full aspect-video bg-black">
                  <iframe
                    src={`https://www.youtube.com/embed/${upload.id}?autoplay=1&rel=0`}
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                    className="absolute inset-0 w-full h-full"
                  />
                </div>
                <div className="flex items-center justify-between px-2 py-1.5">
                  <span className="text-[10px] leading-tight truncate flex-1 text-[var(--text-secondary)]">
                    {upload.title}
                  </span>
                  <button
                    onClick={() => setPlayingVideoId(null)}
                    className="shrink-0 ml-2 w-5 h-5 flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)]/50 transition-colors"
                    aria-label="Stop video"
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setPlayingVideoId(upload.id)}
                className="w-full text-left transition-all duration-200 group hover:ring-2 hover:ring-[var(--accent)]/20 rounded-lg"
              >
                <div className="relative w-full aspect-video overflow-hidden">
                  <img
                    src={upload.thumbnail}
                    alt={upload.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {upload.isTopViewed && (
                    <span className="absolute top-1.5 left-1.5 z-10 px-1.5 py-0.5 bg-amber-500 text-black font-mono text-[9px] font-bold uppercase tracking-wider">
                      TOP
                    </span>
                  )}
                  {upload.viewCount != null && upload.viewCount > 0 && (
                    <ViewCount count={upload.viewCount} />
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200 flex items-center justify-center">
                    <span className="w-9 h-9 flex items-center justify-center bg-white/90 rounded-full text-black text-sm opacity-0 group-hover:opacity-100 transition-all duration-200 scale-90 group-hover:scale-100">
                      &#9654;
                    </span>
                  </div>
                </div>
                <p className="text-[10px] leading-snug px-2 py-1.5 text-[var(--text-secondary)] line-clamp-2">
                  {upload.title}
                </p>
              </button>
            )}
          </div>
        ))}
      </div>
      {uploads.length === 0 && !loading && (
        <p className="text-[var(--text-muted)] text-sm py-4">
          No uploads found for this channel
        </p>
      )}
    </>
  );
}

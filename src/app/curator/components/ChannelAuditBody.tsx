"use client";

import { useState, useCallback, useEffect } from "react";
import type { ApprovedChannel, Upload } from "../types";
import { GenreLabels } from "./GenreLabels";
import { ChannelUploadGrid } from "./ChannelUploadGrid";

interface ChannelAuditBodyProps {
  channel: ApprovedChannel;
  labels: Set<string>;
  onToggleLabel: (label: string) => void;
  onToggleStar?: () => void;
  isStarred?: boolean;
  /** Extra content rendered below the header (e.g. progress indicator) */
  headerExtra?: React.ReactNode;
}

export function ChannelAuditBody({
  channel,
  labels,
  onToggleLabel,
  onToggleStar,
  isStarred,
  headerExtra,
}: ChannelAuditBodyProps) {
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const fetchUploads = useCallback(async () => {
    setLoading(true);
    setPlayingId(null);
    try {
      const res = await fetch(
        `/api/curator?rescan=true&channelId=${channel.id}`
      );
      const json = await res.json();
      setUploads(json.uploads || []);
    } catch {
      setUploads([]);
    }
    setLoading(false);
  }, [channel.id]);

  // Fetch on mount and when channel changes
  useEffect(() => {
    fetchUploads();
  }, [fetchUploads]);

  // X keyboard shortcut for rescan
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "x" || e.key === "X") fetchUploads();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [fetchUploads]);

  return (
    <>
      {/* Channel info */}
      <div className="mb-2">
        <div className="flex items-center gap-3 mb-0.5">
          <h2 className="text-2xl font-bold tracking-tight">{channel.name}</h2>
          {onToggleStar && (
            <button
              onClick={onToggleStar}
              className={`text-2xl leading-none transition-all duration-200 active:scale-150 ${
                isStarred
                  ? "text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                  : "text-[var(--text-muted)]/30 hover:text-amber-400"
              }`}
              title={isStarred ? "Unstar (F)" : "Star (F)"}
            >
              {isStarred ? "\u2605" : "\u2606"}
            </button>
          )}
          {isStarred && (
            <span className="text-[9px] text-amber-400 uppercase tracking-[0.2em] font-bold animate-pulse">
              STARRED
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <a
            href={`https://www.youtube.com/channel/${channel.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--text-muted)] hover:text-[var(--text)] text-xs uppercase tracking-[0.2em] transition-colors"
          >
            <svg className="w-4 h-4 inline-block mr-1.5 -mt-px" viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8zM9.5 15.6V8.4l6.3 3.6-6.3 3.6z"/></svg>
            View on YouTube &rarr;
          </a>
          <button
            onClick={fetchUploads}
            disabled={loading}
            className="text-[var(--text-muted)] hover:text-[var(--text)] text-xs uppercase tracking-[0.2em] transition-colors disabled:opacity-40"
          >
            {loading ? "RESCANNING..." : "RESCAN"}
          </button>
        </div>
        {headerExtra}
      </div>

      <GenreLabels selected={labels} onToggle={onToggleLabel} />

      <div className="pb-36">
        <h3 className="text-[11px] text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2">
          UPLOADS
        </h3>
        <ChannelUploadGrid
          uploads={uploads}
          playingVideoId={playingId}
          setPlayingVideoId={setPlayingId}
          loading={loading}
        />
      </div>
    </>
  );
}

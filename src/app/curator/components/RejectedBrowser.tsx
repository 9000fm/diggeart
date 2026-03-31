"use client";

import { useState, useMemo } from "react";
import { relativeDate } from "../utils";

interface RejectedChannelItem {
  name: string;
  id: string;
  reviewedAt?: string | null;
  importedAt?: string | null;
  notes?: string | null;
}

interface RejectedBrowserProps {
  channels: RejectedChannelItem[];
  loading: boolean;
  onRescue: (channelId: string, channelName: string) => void;
  onReviewChannel?: (ch: { name: string; id: string }) => void;
}

export function RejectedBrowser({
  channels,
  loading,
  onRescue,
  onReviewChannel,
}: RejectedBrowserProps) {
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<"recent" | "az">("recent");

  const filtered = useMemo(() => {
    let result = channels;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((c) => c.name.toLowerCase().includes(q));
    }
    if (sortMode === "recent") {
      result = [...result].sort((a, b) => {
        if (!a.reviewedAt && !b.reviewedAt) return 0;
        if (!a.reviewedAt) return 1;
        if (!b.reviewedAt) return -1;
        return new Date(b.reviewedAt).getTime() - new Date(a.reviewedAt).getTime();
      });
    } else {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    }
    return result;
  }, [channels, search, sortMode]);

  return (
    <div className="space-y-3 pb-8">
      <div className="flex items-center gap-2">
        {channels.length > 5 && (
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search rejected channels..."
            className="flex-1 bg-[var(--bg-alt)] border border-[var(--border)] rounded-lg px-4 py-3 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)]/40 focus:outline-none focus:border-[var(--text-muted)] transition-colors font-mono"
          />
        )}
        <div className="flex items-center border border-[var(--border)] rounded-lg overflow-hidden shrink-0">
          <button
            onClick={() => setSortMode("recent")}
            className={`px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${
              sortMode === "recent"
                ? "bg-[var(--accent)] text-[var(--accent-text)]"
                : "text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            Recent
          </button>
          <button
            onClick={() => setSortMode("az")}
            className={`px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${
              sortMode === "az"
                ? "bg-[var(--accent)] text-[var(--accent-text)]"
                : "text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            A-Z
          </button>
        </div>
      </div>

      <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-[0.2em] pt-3">
        {filtered.length} rejected channel{filtered.length !== 1 ? "s" : ""}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <span className="animate-pulse text-[var(--text-muted)] text-sm">LOADING...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-[var(--text-muted)] text-sm">
            {search.trim() ? `No channels match "${search}"` : "No rejected channels"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((ch) => (
            <div
              key={ch.id}
              onClick={() => onReviewChannel?.(ch)}
              className={`flex items-center gap-4 px-4 py-3.5 border border-[var(--border)] rounded-lg hover:border-[var(--text-muted)]/50 hover:bg-[var(--bg-alt)]/30 transition-all group ${onReviewChannel ? "cursor-pointer" : ""}`}
            >
              <div className="flex-1 min-w-0">
                <span className="text-sm font-bold text-[var(--text)] group-hover:text-[var(--text-secondary)] transition-colors truncate block">
                  {ch.name}
                </span>
                {ch.reviewedAt && (
                  <span className="text-[9px] text-[var(--text-muted)]/40 mt-0.5 block">
                    rejected {relativeDate(ch.reviewedAt)}
                  </span>
                )}
              </div>
              {ch.notes && (
                <span
                  className="shrink-0 text-[var(--text-muted)]/50 hover:text-[var(--text-muted)] transition-colors cursor-default"
                  title={ch.notes}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </span>
              )}
              <a
                href={`https://www.youtube.com/channel/${ch.id}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-alt)] transition-all opacity-0 group-hover:opacity-100"
                title="Preview on YouTube"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
              <button
                onClick={(e) => { e.stopPropagation(); onRescue(ch.id, ch.name); }}
                className="px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider text-emerald-500 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/10 transition-all shrink-0 opacity-0 group-hover:opacity-100"
                title="Move back to Review"
              >
                RESCUE
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useMemo } from "react";
import type { ApprovedChannel } from "../types";
import { GENRE_LABELS } from "../types";

interface ApprovedBrowserProps {
  channels: ApprovedChannel[];
  loading: boolean;
  onEnterAudit: (ch: ApprovedChannel) => void;
}

export function ApprovedBrowser({
  channels,
  loading,
  onEnterAudit,
}: ApprovedBrowserProps) {
  const [search, setSearch] = useState("");
  const [genreFilter, setGenreFilter] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<"recent" | "az">("recent");

  // Genre chip counts
  const genreCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const ch of channels) {
      if (ch.labels) {
        for (const l of ch.labels) {
          counts[l] = (counts[l] || 0) + 1;
        }
      }
    }
    return counts;
  }, [channels]);

  const activeGenres = GENRE_LABELS.filter((g) => genreCounts[g]);
  const untaggedCount = useMemo(
    () => channels.filter((ch) => !ch.labels || ch.labels.length === 0).length,
    [channels]
  );
  const starredCount = useMemo(
    () => channels.filter((ch) => ch.isStarred).length,
    [channels]
  );

  // Filtered channels for search + genre
  const filtered = useMemo(() => {
    let result = channels;
    if (genreFilter === "__no-labels") {
      result = result.filter((ch) => !ch.labels || ch.labels.length === 0);
    } else if (genreFilter === "__starred") {
      result = result.filter((ch) => ch.isStarred);
    } else if (genreFilter) {
      result = result.filter(
        (ch) => ch.labels && ch.labels.includes(genreFilter)
      );
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((ch) => ch.name.toLowerCase().includes(q));
    }
    // Sort
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
  }, [channels, search, genreFilter, sortMode]);

  // Always show filtered (which includes sorting) — no separate "default" view

  return (
    <>
      {/* Search + sort */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search approved channels..."
            className="flex-1 bg-[var(--bg-alt)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)]/40 focus:outline-none focus:border-[var(--text-muted)] transition-colors font-mono"
          />
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

        {/* Filter chips */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {genreFilter && (
            <button
              onClick={() => setGenreFilter(null)}
              className="px-3 py-1.5 text-[10px] rounded-full border border-[var(--text-muted)] text-[var(--text)] transition-all duration-150"
            >
              ALL &times;
            </button>
          )}
          {untaggedCount > 0 && (
            <button
              onClick={() => setGenreFilter((prev) => (prev === "__no-labels" ? null : "__no-labels"))}
              className={`px-3 py-1.5 text-[10px] rounded-full transition-all duration-150 ${
                genreFilter === "__no-labels"
                  ? "bg-amber-500 text-white shadow-sm"
                  : "border border-amber-500/30 text-amber-500 hover:border-amber-500"
              }`}
            >
              No labels ({untaggedCount})
            </button>
          )}
          {starredCount > 0 && (
            <button
              onClick={() => setGenreFilter((prev) => (prev === "__starred" ? null : "__starred"))}
              className={`px-3 py-1.5 text-[10px] rounded-full transition-all duration-150 ${
                genreFilter === "__starred"
                  ? "bg-amber-400 text-black shadow-sm"
                  : "border border-amber-400/30 text-amber-400 hover:border-amber-400"
              }`}
            >
              &#9733; Starred ({starredCount})
            </button>
          )}
          {activeGenres.map((g) => (
            <button
              key={g}
              onClick={() =>
                setGenreFilter((prev) => (prev === g ? null : g))
              }
              className={`px-3 py-1.5 text-[10px] rounded-full transition-all duration-150 ${
                genreFilter === g
                  ? "bg-[var(--accent)] text-[var(--accent-text)] shadow-sm"
                  : "border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--text-secondary)] hover:text-[var(--text)]"
              }`}
            >
              {g} ({genreCounts[g]})
            </button>
          ))}
        </div>
      </div>

      {/* Results — always uses filtered (which includes sorting) */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <span className="animate-pulse text-[var(--text-muted)]">LOADING...</span>
        </div>
      ) : (
        <>
          <div className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider mb-2 pt-3">
            {filtered.length} channel{filtered.length !== 1 ? "s" : ""}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pb-8">
            {filtered.map((ch) => (
              <button
                key={ch.id}
                onClick={() => onEnterAudit(ch)}
                className="rounded-lg border border-[var(--border)] hover:border-[var(--text-muted)] p-3 text-left transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-bold text-[var(--text)] group-hover:text-emerald-500 transition-colors truncate block">
                      {ch.name}
                    </span>
                    {ch.labels && ch.labels.length > 0 ? (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {ch.labels.map((l) => (
                          <span
                            key={l}
                            className="text-[8px] px-1.5 py-0.5 bg-[var(--bg-alt)] text-[var(--text-muted)] rounded uppercase tracking-wider"
                          >
                            {l}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[9px] text-[var(--text-muted)]/50 uppercase tracking-wider mt-1 block">
                        No labels
                      </span>
                    )}
                  </div>
                  {ch.notes && (
                    <span
                      className="shrink-0 text-[var(--text-muted)]/50 hover:text-[var(--text-muted)] transition-colors"
                      title={ch.notes}
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                    </span>
                  )}
                  {ch.isStarred && (
                    <span className="text-amber-400 text-sm leading-none shrink-0">
                      &#9733;
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
          {filtered.length === 0 && (
            <p className="text-[var(--text-muted)] text-sm py-8 text-center">
              No channels match
            </p>
          )}
        </>
      )}

      {/* Footer stats */}
      <div className="text-center text-[var(--text-muted)] text-[11px] tracking-wider uppercase py-4">
        {channels.length} approved &middot; {starredCount} starred &middot; {untaggedCount} untagged
      </div>
    </>
  );
}

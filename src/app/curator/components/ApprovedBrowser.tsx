"use client";

import { useState, useMemo } from "react";
import type { ApprovedChannel, QueueType } from "../types";
import { GENRE_LABELS } from "../types";

interface ApprovedBrowserProps {
  channels: ApprovedChannel[];
  loading: boolean;
  onEnterAudit: (ch: ApprovedChannel) => void;
  onStartQueue: (queueType: QueueType, channels: ApprovedChannel[]) => void;
}

export function ApprovedBrowser({
  channels,
  loading,
  onEnterAudit,
  onStartQueue,
}: ApprovedBrowserProps) {
  const [search, setSearch] = useState("");
  const [genreFilter, setGenreFilter] = useState<string | null>(null);

  const untagged = useMemo(
    () => channels.filter((ch) => !ch.labels || ch.labels.length === 0),
    [channels]
  );
  const starred = useMemo(
    () => channels.filter((ch) => ch.isStarred),
    [channels]
  );

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

  // Filtered channels for search + genre
  const filtered = useMemo(() => {
    let result = channels;
    if (genreFilter) {
      result = result.filter(
        (ch) => ch.labels && ch.labels.includes(genreFilter)
      );
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((ch) => ch.name.toLowerCase().includes(q));
    }
    return result;
  }, [channels, search, genreFilter]);

  const showResults = search.trim().length > 0 || genreFilter !== null;

  return (
    <>
      {/* Audit Queues */}
      <div className="mb-6">
        <h3 className="text-[11px] text-[var(--text-muted)] uppercase tracking-[0.2em] mb-3">
          AUDIT QUEUES
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Tag Untagged */}
          <button
            onClick={() => onStartQueue("tag-untagged", untagged)}
            disabled={untagged.length === 0}
            className="group relative flex items-center rounded-none border border-[var(--border)] transition-all duration-100 hover:border-emerald-500/50 active:scale-[0.98] disabled:opacity-30 disabled:pointer-events-none text-left"
          >
            <div className="w-1.5 self-stretch bg-emerald-500 shrink-0" />
            <div className="flex-1 px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-emerald-500 text-lg leading-none">
                  &#9654;
                </span>
                <span className="text-sm font-bold uppercase tracking-wider text-[var(--text)] group-hover:text-emerald-500 transition-colors">
                  TAG {untagged.length} UNTAGGED
                </span>
              </div>
              <p className="text-[10px] text-[var(--text-muted)] tracking-wide">
                Listen and assign genre labels
              </p>
            </div>
          </button>

          {/* Re-Audit Starred */}
          <button
            onClick={() => onStartQueue("re-audit-starred", starred)}
            disabled={starred.length === 0}
            className="group relative flex items-center rounded-none border border-[var(--border)] transition-all duration-100 hover:border-amber-400/50 active:scale-[0.98] disabled:opacity-30 disabled:pointer-events-none text-left"
          >
            <div className="w-1.5 self-stretch bg-amber-400 shrink-0" />
            <div className="flex-1 px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-amber-400 text-lg leading-none">
                  &#9654;
                </span>
                <span className="text-sm font-bold uppercase tracking-wider text-[var(--text)] group-hover:text-amber-400 transition-colors">
                  RE-AUDIT {starred.length} STARRED
                </span>
              </div>
              <p className="text-[10px] text-[var(--text-muted)] tracking-wide">
                Review starred channels for labels or changes
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Find a Channel */}
      <div className="mb-4">
        <h3 className="text-[11px] text-[var(--text-muted)] uppercase tracking-[0.2em] mb-3">
          FIND A CHANNEL
        </h3>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name..."
          className="w-full bg-[var(--bg-alt)] border border-[var(--border)] px-4 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)]/50 focus:outline-none focus:border-[var(--text-muted)] transition-colors font-mono"
        />

        {/* Genre filter chips */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {genreFilter && (
            <button
              onClick={() => setGenreFilter(null)}
              className="px-3 py-1.5 text-[10px] rounded-full border border-[var(--text-muted)] text-[var(--text)] transition-all duration-150"
            >
              ALL &times;
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

      {/* Filtered results */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <span className="animate-pulse text-[var(--text-muted)]">
            LOADING...
          </span>
        </div>
      ) : showResults ? (
        <>
          <div className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider mb-2">
            {filtered.length} result{filtered.length !== 1 ? "s" : ""}
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
      ) : null}

      {/* Footer stats */}
      <div className="text-center text-[var(--text-muted)] text-[11px] tracking-wider uppercase py-4">
        {channels.length} approved &middot; {starred.length} starred &middot;{" "}
        {untagged.length} untagged
      </div>
    </>
  );
}

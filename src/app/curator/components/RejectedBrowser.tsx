"use client";

import { useState, useMemo } from "react";
import type { FilteredChannel, ApprovedChannel, QueueType } from "../types";

interface RejectedChannel {
  name: string;
  id: string;
  reviewedAt?: string | null;
  importedAt?: string | null;
}

interface RejectedBrowserProps {
  rejectedChannels: RejectedChannel[];
  filteredChannels: FilteredChannel[];
  rejectedLoading: boolean;
  filteredLoading: boolean;
  onRescueFiltered: (channelId: string, channelName: string) => void;
  onRescueRejected: (channelId: string, channelName: string) => void;
  onStartQueue: (queueType: QueueType, channels: ApprovedChannel[]) => void;
  onEnterAudit: (ch: ApprovedChannel) => void;
}

function relativeDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export function RejectedBrowser({
  rejectedChannels,
  filteredChannels,
  rejectedLoading,
  filteredLoading,
  onRescueFiltered,
  onRescueRejected,
  onStartQueue,
  onEnterAudit,
}: RejectedBrowserProps) {
  const [search, setSearch] = useState("");

  const filteredFiltered = useMemo(() => {
    if (!search.trim()) return filteredChannels;
    const q = search.toLowerCase();
    return filteredChannels.filter((c) => c.name.toLowerCase().includes(q));
  }, [filteredChannels, search]);

  const filteredRejected = useMemo(() => {
    if (!search.trim()) return rejectedChannels;
    const q = search.toLowerCase();
    return rejectedChannels.filter((c) => c.name.toLowerCase().includes(q));
  }, [rejectedChannels, search]);

  const loading = rejectedLoading || filteredLoading;

  return (
    <div className="space-y-8 pb-8">
      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search rejected & filtered channels..."
        className="w-full bg-[var(--bg-alt)] border border-[var(--border)] px-4 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)]/50 focus:outline-none focus:border-[var(--text-muted)] transition-colors font-mono"
      />

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <span className="animate-pulse text-[var(--text-muted)]">LOADING...</span>
        </div>
      ) : (
        <>
          {/* Section 1: Auto-Filtered */}
          <section>
            <div className="mb-3">
              <h3 className="text-[11px] text-[var(--text-muted)] uppercase tracking-[0.2em]">
                AUTO-FILTERED &middot; {filteredFiltered.length} channel{filteredFiltered.length !== 1 ? "s" : ""}
              </h3>
              <p className="text-[10px] text-[var(--text-muted)]/60 mt-0.5">
                These didn&apos;t match music topics &mdash; some might be wrong
              </p>
            </div>

            {filteredFiltered.length === 0 ? (
              <p className="text-[var(--text-muted)] text-sm py-4 text-center">
                {search.trim() ? "No filtered channels match" : "No auto-filtered channels"}
              </p>
            ) : (
              <div className="space-y-1">
                {filteredFiltered.map((ch) => (
                  <div
                    key={ch.id}
                    className="flex items-center gap-3 px-3 py-2.5 border border-[var(--border)] hover:border-[var(--text-muted)] transition-colors group cursor-pointer"
                    onClick={() => onEnterAudit({ name: ch.name, id: ch.id })}
                  >
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-bold text-[var(--text)] group-hover:text-emerald-500 transition-colors truncate block">
                        {ch.name}
                      </span>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {ch.topics.map((t) => (
                          <span
                            key={t}
                            className="text-[8px] px-1.5 py-0.5 bg-[var(--bg-alt)] text-[var(--text-muted)] rounded uppercase tracking-wider"
                          >
                            {t}
                          </span>
                        ))}
                        {ch.importedAt && (
                          <span className="text-[8px] text-[var(--text-muted)]/50 ml-1">
                            {relativeDate(ch.importedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRescueFiltered(ch.id, ch.name);
                      }}
                      className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-500 border border-emerald-500/30 hover:bg-emerald-500/10 transition-all rounded shrink-0"
                    >
                      RESCUE
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Section 2: Manually Rejected */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[11px] text-[var(--text-muted)] uppercase tracking-[0.2em]">
                REJECTED &middot; {filteredRejected.length} channel{filteredRejected.length !== 1 ? "s" : ""}
              </h3>
              {rejectedChannels.length > 0 && (
                <button
                  onClick={() =>
                    onStartQueue(
                      "spot-check-rejected",
                      rejectedChannels.map((c) => ({ name: c.name, id: c.id }))
                    )
                  }
                  className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-500 border border-amber-500/30 hover:bg-amber-500/10 transition-all rounded"
                >
                  SPOT-CHECK ALL
                </button>
              )}
            </div>

            {filteredRejected.length === 0 ? (
              <p className="text-[var(--text-muted)] text-sm py-4 text-center">
                {search.trim() ? "No rejected channels match" : "No rejected channels"}
              </p>
            ) : (
              <div className="space-y-1">
                {filteredRejected.map((ch) => (
                  <div
                    key={ch.id}
                    className="flex items-center gap-3 px-3 py-2.5 border border-[var(--border)] hover:border-[var(--text-muted)] transition-colors group cursor-pointer"
                    onClick={() => onEnterAudit({ name: ch.name, id: ch.id })}
                  >
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-bold text-[var(--text)] group-hover:text-amber-500 transition-colors truncate block">
                        {ch.name}
                      </span>
                      {ch.reviewedAt && (
                        <span className="text-[9px] text-[var(--text-muted)]/50">
                          rejected {relativeDate(ch.reviewedAt)}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRescueRejected(ch.id, ch.name);
                      }}
                      className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-500 border border-emerald-500/30 hover:bg-emerald-500/10 transition-all rounded shrink-0"
                    >
                      RESCUE
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

"use client";

import { useState, useMemo } from "react";

interface ReviewChannel {
  name: string;
  id: string;
  origin?: string;
  importedAt?: string | null;
}

interface ReviewListProps {
  channels: ReviewChannel[];
  loading: boolean;
  onReviewChannel: (ch: ReviewChannel) => void;
  onSync: () => void;
  syncing: boolean;
  syncError?: string;
  syncDone?: boolean;
  onQuickImport: (url: string) => void;
  importing: boolean;
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

export function ReviewList({
  channels,
  loading,
  onReviewChannel,
  onSync,
  syncing,
  syncError,
  syncDone,
  onQuickImport,
  importing,
}: ReviewListProps) {
  const [search, setSearch] = useState("");
  const [quickUrl, setQuickUrl] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return channels;
    const q = search.toLowerCase();
    return channels.filter((ch) => ch.name.toLowerCase().includes(q));
  }, [channels, search]);

  const handleSubmitUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickUrl.trim()) {
      onQuickImport(quickUrl.trim());
      setQuickUrl("");
    }
  };

  // Empty state — all caught up
  if (!loading && channels.length === 0) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-8">
        <div>
          <div className="text-4xl mb-4 opacity-60">&#10003;</div>
          <h2 className="text-xl font-bold tracking-wider uppercase">All caught up</h2>
          <p className="text-sm text-[var(--text-muted)] mt-2">
            No channels waiting for review. Sync your subscriptions or add a channel manually.
          </p>
        </div>

        <div className="space-y-3">
          {syncError && !syncDone && (
            <p className="text-xs text-red-400">Sign in again to sync</p>
          )}
          <button
            onClick={onSync}
            disabled={syncing || syncDone}
            className={`px-8 py-3 text-sm font-bold uppercase tracking-[0.15em] rounded-lg transition-all disabled:opacity-40 ${
              syncDone
                ? "bg-[var(--bg-alt)] border border-[var(--border)] text-[var(--text-muted)]"
                : "bg-[var(--accent)] text-[var(--accent-text)] hover:opacity-90"
            }`}
          >
            {syncing ? "SYNCING..." : syncDone ? "UP TO DATE" : "SYNC SUBSCRIPTIONS"}
          </button>
        </div>

        <form onSubmit={handleSubmitUrl} className="flex items-center gap-2 max-w-sm mx-auto">
          <input
            type="text"
            value={quickUrl}
            onChange={(e) => setQuickUrl(e.target.value)}
            placeholder="Paste channel URL..."
            className="flex-1 px-3 py-2.5 bg-[var(--bg-alt)] border border-[var(--border)] rounded-lg font-mono text-xs text-[var(--text)] placeholder:text-[var(--text-muted)]/40 focus:outline-none focus:border-[var(--text-secondary)] transition-colors"
          />
          <button
            type="submit"
            disabled={importing || !quickUrl.trim()}
            className="px-4 py-2.5 bg-[var(--bg-alt)] border border-[var(--border)] text-[var(--text-muted)] font-mono text-[10px] font-bold uppercase tracking-wider rounded-lg hover:text-[var(--text)] hover:border-[var(--text-secondary)] transition-all disabled:opacity-40"
          >
            {importing ? "..." : "+ ADD"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-8">
      {/* Top bar: search + sync + import — all in one row */}
      <div className="flex items-center gap-2">
        {channels.length > 10 && (
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="flex-1 bg-[var(--bg-alt)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)]/40 focus:outline-none focus:border-[var(--text-muted)] transition-colors font-mono"
          />
        )}
        {!channels.length || channels.length <= 10 ? <div className="flex-1" /> : null}
        <button
          onClick={onSync}
          disabled={syncing || syncDone}
          className={`px-3 py-2 text-[10px] font-bold uppercase tracking-wider border rounded-lg transition-all disabled:opacity-40 shrink-0 ${
            syncDone ? "border-emerald-500/30 text-emerald-500" : "border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--text-secondary)]"
          }`}
        >
          {syncing ? "..." : syncDone ? "SYNCED" : "SYNC"}
        </button>
        <form onSubmit={handleSubmitUrl} className="flex items-center gap-1.5 shrink-0">
          <input
            type="text"
            value={quickUrl}
            onChange={(e) => setQuickUrl(e.target.value)}
            placeholder="Paste URL..."
            className="w-40 px-3 py-2 bg-[var(--bg-alt)] border border-[var(--border)] rounded-lg font-mono text-xs text-[var(--text)] placeholder:text-[var(--text-muted)]/40 focus:outline-none focus:border-[var(--text-secondary)] transition-colors"
          />
          <button
            type="submit"
            disabled={importing || !quickUrl.trim()}
            className="px-3 py-2 bg-[var(--bg-alt)] border border-[var(--border)] text-[var(--text-muted)] font-mono text-[10px] font-bold uppercase tracking-wider rounded-lg hover:text-[var(--text)] hover:border-[var(--text-secondary)] transition-all disabled:opacity-40"
          >
            {importing ? "..." : "+"}
          </button>
        </form>
      </div>
      {syncError && !syncDone && (
        <p className="text-[10px] text-red-400">Session expired — sign in again</p>
      )}

      {/* Count */}
      <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-[0.2em] pt-3">
        {filtered.length} channel{filtered.length !== 1 ? "s" : ""} to review
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <span className="animate-pulse text-[var(--text-muted)] text-sm">LOADING...</span>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((ch) => (
            <div
              key={ch.id}
              onClick={() => onReviewChannel(ch)}
              className="flex items-center gap-4 px-4 py-3.5 border border-[var(--border)] rounded-lg hover:border-[var(--text-muted)]/50 hover:bg-[var(--bg-alt)]/30 transition-all cursor-pointer group"
            >
              <div className="flex-1 min-w-0">
                <span className="text-sm font-bold text-[var(--text)] group-hover:text-[var(--text-secondary)] transition-colors truncate block">
                  {ch.name}
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  {ch.origin && (
                    <span className="text-[8px] px-2 py-0.5 bg-[var(--bg-alt)] text-[var(--text-muted)] rounded-full uppercase tracking-wider">
                      {ch.origin}
                    </span>
                  )}
                  {ch.importedAt && (
                    <span className="text-[8px] text-[var(--text-muted)]/40">
                      {relativeDate(ch.importedAt)}
                    </span>
                  )}
                </div>
              </div>
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
            </div>
          ))}
          {filtered.length === 0 && search.trim() && (
            <p className="text-[var(--text-muted)] text-sm py-8 text-center">
              No channels match &quot;{search}&quot;
            </p>
          )}
        </div>
      )}
    </div>
  );
}

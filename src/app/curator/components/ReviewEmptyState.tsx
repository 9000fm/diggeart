"use client";

import { useState } from "react";

interface ReviewEmptyStateProps {
  approvedCount: number;
  total: number;
  skippedCount: number;
  onReviewSkipped: () => void;
  onQuickImport: (url: string) => void;
  onImportSubscriptions: () => Promise<void>;
  importing: boolean;
  onRefresh: () => void;
  newSubCount: number;
  subCheckError?: string;
}

export function ReviewEmptyState({
  approvedCount,
  total,
  skippedCount,
  onReviewSkipped,
  onQuickImport,
  onImportSubscriptions,
  importing,
  onRefresh,
  newSubCount,
  subCheckError,
}: ReviewEmptyStateProps) {
  const [quickUrl, setQuickUrl] = useState("");
  const [importingSubs, setImportingSubs] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickUrl.trim()) {
      onQuickImport(quickUrl.trim());
      setQuickUrl("");
    }
  };

  const handleImportSubs = async () => {
    setImportingSubs(true);
    await onImportSubscriptions();
    setImportingSubs(false);
  };

  return (
    <div className="max-w-lg mx-auto py-16 space-y-6 text-center">
      <div>
        <h2 className="text-2xl font-bold tracking-wider">ALL CAUGHT UP</h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          {approvedCount} approved &middot; {total} total
        </p>
      </div>

      {/* Sync subscriptions — always visible */}
      <div className="space-y-3">
        {subCheckError ? (
          <p className="text-sm text-red-400">
            Sync failed &mdash; try signing out and back in
          </p>
        ) : newSubCount > 0 ? (
          <>
            <p className="text-sm text-[var(--text-secondary)]">
              Found <span className="font-bold">{newSubCount}</span> new channel{newSubCount !== 1 ? "s" : ""} from your subscriptions
            </p>
            <button
              onClick={handleImportSubs}
              disabled={importingSubs}
              className="px-6 py-2.5 text-sm font-bold uppercase tracking-[0.15em] bg-[var(--text-secondary)] text-[var(--bg)] hover:opacity-80 transition-opacity rounded-lg disabled:opacity-40"
            >
              {importingSubs ? "IMPORTING..." : `IMPORT ${newSubCount} CHANNEL${newSubCount !== 1 ? "S" : ""}`}
            </button>
          </>
        ) : (
          <button
            onClick={handleImportSubs}
            disabled={importingSubs}
            className="px-6 py-2.5 text-sm font-bold uppercase tracking-[0.15em] bg-[var(--bg-alt)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--text-secondary)] transition-all rounded-lg disabled:opacity-40"
          >
            {importingSubs ? "SYNCING..." : "SYNC SUBSCRIPTIONS"}
          </button>
        )}
      </div>

      {skippedCount > 0 && (
        <button
          onClick={onReviewSkipped}
          className="px-6 py-2.5 text-sm font-bold uppercase tracking-[0.15em] bg-[var(--accent)] text-[var(--accent-text)] hover:opacity-80 transition-opacity rounded-lg"
        >
          REVIEW {skippedCount} SKIPPED
        </button>
      )}

      {/* Quick import: single-line */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest shrink-0">
          QUICK IMPORT
        </label>
        <input
          type="text"
          value={quickUrl}
          onChange={(e) => setQuickUrl(e.target.value)}
          placeholder="youtube.com/@channel or paste URL"
          className="flex-1 px-3 py-2 bg-[var(--bg-alt)] border border-[var(--border)] rounded-lg font-mono text-xs text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--text-secondary)] transition-colors"
        />
        <button
          type="submit"
          disabled={importing || !quickUrl.trim()}
          className="px-3 py-2 bg-[var(--accent)] text-[var(--accent-text)] font-mono text-[10px] font-bold uppercase tracking-wider rounded-lg hover:opacity-80 transition-opacity disabled:opacity-40"
        >
          {importing ? "..." : "+"}
        </button>
      </form>

      {/* Refresh */}
      <button
        onClick={onRefresh}
        className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text)] uppercase tracking-[0.2em] transition-colors"
      >
        Refresh
      </button>
    </div>
  );
}

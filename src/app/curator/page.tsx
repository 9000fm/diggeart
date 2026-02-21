"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface Upload {
  id: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
}

interface CuratorData {
  channel?: { name: string; id: string };
  uploads?: Upload[];
  reviewed: number;
  total: number;
  remaining?: number;
  approvedCount?: number;
  unsubCount?: number;
  done?: boolean;
}

interface BookmarkEntry {
  name: string;
  url: string;
  path: string;
}

const GENRE_LABELS = [
  "House",
  "Deep House",
  "Tech House",
  "Techno",
  "Minimal",
  "Rominimal",
  "Electro",
  "Breaks",
  "DnB",
  "Jungle",
  "Garage / UKG",
  "Ambient",
  "IDM",
  "Dub",
  "Disco",
  "Funk",
  "Acid",
  "Trance",
  "Industrial",
  "EBM",
  "Hip Hop",
  "Soul / R&B",
  "Jazz",
  "Reggae",
  "Pop",
  "World",
  "Experimental",
  "Samples",
  "DJ Sets",
  "Live Sets",
];

export default function CuratorPage() {
  const [data, setData] = useState<CuratorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const actingRef = useRef(false);
  const [history, setHistory] = useState<string[]>([]);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    added: string[];
    failed: string[];
  } | null>(null);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [selectedLabels, setSelectedLabels] = useState<Set<string>>(new Set());
  const [bookmarks, setBookmarks] = useState<BookmarkEntry[] | null>(null);
  const [loadingBookmarks, setLoadingBookmarks] = useState(false);
  const [selectedBookmarks, setSelectedBookmarks] = useState<Set<string>>(
    new Set()
  );
  const [importedUrls, setImportedUrls] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);

  const fetchNext = useCallback(async () => {
    setLoading(true);
    setPlayingVideoId(null);
    setSelectedLabels(new Set());
    const res = await fetch("/api/curator");
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchNext();
  }, [fetchNext]);

  const handleDecision = useCallback(
    async (decision: "approve" | "reject" | "unsubscribe") => {
      if (!data?.channel || actingRef.current) return;
      actingRef.current = true;
      setActing(true);
      setHistory((prev) => [...prev, data.channel!.id]);
      await fetch("/api/curator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: data.channel.id,
          channelName: data.channel.name,
          decision,
          labels: decision === "approve" ? Array.from(selectedLabels) : [],
        }),
      });
      actingRef.current = false;
      setActing(false);
      fetchNext();
    },
    [data, fetchNext, selectedLabels]
  );

  const toggleLabel = (label: string) => {
    setSelectedLabels((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const handleImport = async () => {
    if (!importText.trim() || importing) return;
    setImporting(true);
    setImportResult(null);
    const res = await fetch("/api/curator/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls: importText }),
    });
    const result = await res.json();
    setImportResult({ added: result.added, failed: result.failed });
    setImporting(false);
    if (result.added.length > 0) {
      setImportText("");
      fetchNext();
    }
  };

  const loadBookmarks = async () => {
    setLoadingBookmarks(true);
    const res = await fetch("/api/curator/bookmarks");
    const json = await res.json();
    setBookmarks(json.bookmarks || []);
    setSelectedBookmarks(new Set());
    setLoadingBookmarks(false);
  };

  const toggleBookmark = (url: string) => {
    setSelectedBookmarks((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  };

  const importSelectedBookmarks = async () => {
    if (selectedBookmarks.size === 0 || importing) return;
    setImporting(true);
    setImportResult(null);
    const selectedUrls = Array.from(selectedBookmarks);
    const res = await fetch("/api/curator/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls: selectedUrls.join("\n") }),
    });
    const result = await res.json();
    setImportResult({ added: result.added, failed: result.failed });
    setImporting(false);
    if (result.added.length > 0) {
      setImportedUrls((prev) => [...prev, ...selectedUrls]);
      setBookmarks(
        (prev) =>
          prev?.filter((b) => !selectedBookmarks.has(b.url)) ?? null
      );
      setSelectedBookmarks(new Set());
      fetchNext();
    }
  };

  const deleteFromChrome = async () => {
    if (importedUrls.length === 0 || deleting) return;
    setDeleting(true);
    const res = await fetch("/api/curator/bookmarks", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls: importedUrls }),
    });
    const result = await res.json();
    setDeleting(false);
    if (result.removed > 0) {
      setImportedUrls([]);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (e.key === "a" || e.key === "A") handleDecision("approve");
      if (e.key === "r" || e.key === "R") handleDecision("reject");
      if (e.key === "u" || e.key === "U") handleDecision("unsubscribe");
      if (e.key === "s" || e.key === "S") fetchNext();
      if (e.key === "Escape") setPlayingVideoId(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleDecision, fetchNext]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex items-center justify-center font-mono">
        <span className="animate-pulse">LOADING...</span>
      </div>
    );
  }

  if (data?.done) {
    return (
      <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col items-center justify-center font-mono gap-4">
        <span className="text-3xl">ALL CHANNELS REVIEWED</span>
        <span className="text-[var(--text-secondary)]">
          {data.approvedCount} approved · {data.unsubCount} flagged for unsub ·{" "}
          {data.total} total
        </span>
        <a
          href="/"
          className="mt-4 text-sm text-[var(--text-muted)] hover:text-[var(--text)] underline transition-colors"
        >
          Back to home
        </a>
      </div>
    );
  }

  const channel = data?.channel;
  const uploads = data?.uploads || [];
  const progress = data ? Math.round((data.reviewed / data.total) * 100) : 0;

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] font-mono">
      <div className="max-w-6xl mx-auto px-6 py-4 lg:px-10 lg:py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-5">
            <a
              href="/"
              className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors text-2xl leading-none"
              title="Back to home"
            >
              &larr;
            </a>
            <h1 className="text-lg font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]">
              CURATOR
            </h1>
          </div>
          <div className="text-right space-y-1">
            <span className="text-[var(--text)] text-sm font-bold block tabular-nums">
              {data?.reviewed}
              <span className="text-[var(--text-muted)] font-normal">
                {" "}/ {data?.total}
              </span>
            </span>
            <span className="text-[var(--text-muted)] text-[11px] tracking-wide">
              {data?.approvedCount} approved · {data?.unsubCount} unsub ·{" "}
              {data?.remaining} left
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-px bg-[var(--border)] mb-4 relative">
          <div
            className="absolute top-0 left-0 h-[3px] -translate-y-[1px] bg-[var(--accent)] transition-all duration-500 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Import section */}
        <div className="mb-4">
          <button
            onClick={() => setShowImport(!showImport)}
            className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text)] font-mono uppercase tracking-[0.2em] transition-colors"
          >
            {showImport ? "- HIDE IMPORT" : "+ IMPORT CHANNELS"}
          </button>

          {showImport && (
            <div className="mt-4 space-y-6">
              {/* Chrome bookmarks */}
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <h4 className="text-xs text-[var(--text-muted)] uppercase tracking-widest">
                    FROM CHROME BOOKMARKS
                  </h4>
                  <button
                    onClick={loadBookmarks}
                    disabled={loadingBookmarks}
                    className="px-3 py-1 bg-[var(--accent)] text-[var(--accent-text)] font-mono text-[10px] uppercase tracking-wider rounded-lg hover:opacity-80 transition-opacity disabled:opacity-40"
                  >
                    {loadingBookmarks
                      ? "SCANNING..."
                      : bookmarks
                        ? "REFRESH"
                        : "SCAN BOOKMARKS"}
                  </button>
                </div>

                {bookmarks && bookmarks.length > 0 && (
                  <>
                    <div className="max-h-60 overflow-y-auto space-y-1 border border-[var(--border)] rounded-lg p-2">
                      {bookmarks.map((b) => (
                        <label
                          key={b.url}
                          className="flex items-start gap-2 p-2 rounded hover:bg-[var(--bg-alt)] cursor-pointer text-xs"
                        >
                          <input
                            type="checkbox"
                            checked={selectedBookmarks.has(b.url)}
                            onChange={() => toggleBookmark(b.url)}
                            className="mt-0.5 shrink-0"
                          />
                          <div className="min-w-0">
                            <span className="block truncate text-[var(--text)]">
                              {b.name}
                            </span>
                            <span className="block truncate text-[var(--text-muted)] text-[10px]">
                              {b.path} · {b.url}
                            </span>
                          </div>
                        </label>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <button
                        onClick={() => {
                          if (selectedBookmarks.size === bookmarks.length) {
                            setSelectedBookmarks(new Set());
                          } else {
                            setSelectedBookmarks(
                              new Set(bookmarks.map((b) => b.url))
                            );
                          }
                        }}
                        className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text)] uppercase tracking-wider transition-colors"
                      >
                        {selectedBookmarks.size === bookmarks.length
                          ? "DESELECT ALL"
                          : "SELECT ALL"}
                      </button>
                      <button
                        onClick={importSelectedBookmarks}
                        disabled={importing || selectedBookmarks.size === 0}
                        className="px-3 py-1 bg-[var(--accent)] text-[var(--accent-text)] font-mono text-[10px] uppercase tracking-wider rounded-lg hover:opacity-80 transition-opacity disabled:opacity-40"
                      >
                        {importing
                          ? "IMPORTING..."
                          : `IMPORT ${selectedBookmarks.size} SELECTED`}
                      </button>
                    </div>
                  </>
                )}
                {bookmarks && bookmarks.length === 0 && (
                  <p className="text-xs text-[var(--text-muted)]">
                    No YouTube channel bookmarks found
                  </p>
                )}
              </div>

              {/* Paste URLs */}
              <div>
                <h4 className="text-xs text-[var(--text-muted)] uppercase tracking-widest mb-2">
                  PASTE URLS
                </h4>
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder={
                    "https://youtube.com/@BoilerRoom\nhttps://youtube.com/channel/UCxxxxxxx\n@Cercle"
                  }
                  className="w-full h-24 p-3 bg-[var(--bg-alt)] border border-[var(--border)] rounded-lg font-mono text-xs text-[var(--text)] placeholder:text-[var(--text-muted)] resize-none focus:outline-none focus:border-[var(--text-secondary)] transition-colors"
                />
                <div className="flex items-center gap-3 mt-2">
                  <button
                    onClick={handleImport}
                    disabled={importing || !importText.trim()}
                    className="px-3 py-1 bg-[var(--accent)] text-[var(--accent-text)] font-mono text-[10px] uppercase tracking-wider rounded-lg hover:opacity-80 transition-opacity disabled:opacity-40"
                  >
                    {importing ? "IMPORTING..." : "IMPORT"}
                  </button>
                </div>
              </div>

              {/* Import results */}
              {importResult && importResult.added.length > 0 && (
                <div className="text-xs text-emerald-500">
                  Added: {importResult.added.join(", ")}
                </div>
              )}
              {importResult && importResult.failed.length > 0 && (
                <div className="text-xs text-red-400">
                  Failed: {importResult.failed.join(", ")}
                </div>
              )}

              {/* Delete imported from Chrome */}
              {importedUrls.length > 0 && (
                <div className="flex items-center gap-3 pt-2 border-t border-[var(--border)]">
                  <button
                    onClick={deleteFromChrome}
                    disabled={deleting}
                    className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white font-mono text-[10px] uppercase tracking-wider rounded-lg transition-colors disabled:opacity-40"
                  >
                    {deleting
                      ? "DELETING..."
                      : `DELETE ${importedUrls.length} FROM CHROME BOOKMARKS`}
                  </button>
                  <span className="text-[10px] text-[var(--text-muted)]">
                    Close Chrome first for best results
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {channel && (
          <>
            {/* Channel info */}
            <div className="mb-4">
              <h2 className="text-2xl font-bold tracking-tight mb-1">
                {channel.name}
              </h2>
              <a
                href={`https://www.youtube.com/channel/${channel.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--text-muted)] hover:text-[var(--text)] text-xs uppercase tracking-[0.2em] transition-colors"
              >
                View on YouTube &rarr;
              </a>
            </div>

            {/* Two-column layout: uploads left, actions right */}
            <div className="flex flex-col lg:flex-row gap-10">
              {/* Left — uploads grid */}
              <div className="flex-1 min-w-0">
                <h3 className="text-[11px] text-[var(--text-muted)] uppercase tracking-[0.2em] mb-4">
                  UPLOADS
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {uploads.map((upload) => (
                    <div
                      key={upload.id}
                      className="rounded-xl overflow-hidden bg-[var(--bg-alt)]"
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
                          <div className="flex items-center justify-between px-3 py-2.5">
                            <span className="text-[11px] leading-tight truncate flex-1 text-[var(--text-secondary)]">
                              {upload.title}
                            </span>
                            <button
                              onClick={() => setPlayingVideoId(null)}
                              className="shrink-0 ml-3 text-[10px] uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                            >
                              STOP
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setPlayingVideoId(upload.id)}
                          className="w-full text-left transition-all duration-200 group hover:ring-2 hover:ring-[var(--accent)]/20 rounded-xl"
                        >
                          <div className="relative w-full aspect-video overflow-hidden">
                            <img
                              src={upload.thumbnail}
                              alt={upload.title}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200 flex items-center justify-center">
                              <span className="w-11 h-11 flex items-center justify-center bg-white/90 rounded-full text-black text-base opacity-0 group-hover:opacity-100 transition-all duration-200 scale-90 group-hover:scale-100">
                                ▶
                              </span>
                            </div>
                          </div>
                          <p className="text-[11px] leading-snug px-3 py-2.5 text-[var(--text-secondary)] line-clamp-2">
                            {upload.title}
                          </p>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {uploads.length === 0 && (
                  <p className="text-[var(--text-muted)] text-sm py-8">
                    No uploads found for this channel
                  </p>
                )}
              </div>

              {/* Right — sticky panel: genres + actions */}
              <div className="lg:w-80 shrink-0">
                <div className="lg:sticky lg:top-8">
                  {/* Genre labels */}
                  <div className="mb-10">
                    <h3 className="text-[11px] text-[var(--text-muted)] uppercase tracking-[0.2em] mb-5">
                      TAGS
                    </h3>
                    <div className="flex flex-wrap gap-2.5">
                      {GENRE_LABELS.map((label) => (
                        <button
                          key={label}
                          onClick={() => toggleLabel(label)}
                          className={`px-3.5 py-1.5 text-[11px] rounded-full transition-all duration-200 ${
                            selectedLabels.has(label)
                              ? "bg-[var(--accent)] text-[var(--accent-text)] shadow-sm"
                              : "border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--text-secondary)] hover:text-[var(--text)]"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    {selectedLabels.size > 0 && (
                      <p className="text-[10px] text-[var(--text-muted)] mt-3">
                        {Array.from(selectedLabels).join("  ·  ")}
                      </p>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-[var(--border)] mb-6" />

                  {/* Decision buttons */}
                  <div className="flex flex-col gap-4">
                    {/* Approve — primary action, full width */}
                    <button
                      onClick={() => handleDecision("approve")}
                      disabled={acting}
                      className="w-full py-4 text-xs font-bold uppercase tracking-wide bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 hover:bg-emerald-500 hover:text-white hover:shadow-lg hover:shadow-emerald-500/20 rounded-xl transition-all duration-200 disabled:opacity-40"
                    >
                      APPROVE
                      <span className="ml-2 text-[10px] opacity-40 font-normal">
                        A
                      </span>
                    </button>

                    {/* Reject / Unsub — side by side */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleDecision("reject")}
                        disabled={acting}
                        className="flex-1 py-3 text-xs font-bold uppercase tracking-wide border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--text)] hover:text-[var(--text)] hover:bg-[var(--bg-alt)] rounded-xl transition-all duration-200 disabled:opacity-40"
                      >
                        REJECT
                        <span className="ml-2 text-[10px] opacity-30 font-normal">
                          R
                        </span>
                      </button>
                      <button
                        onClick={() => handleDecision("unsubscribe")}
                        disabled={acting}
                        className="flex-1 py-3 text-xs font-bold uppercase tracking-wide border border-red-500/20 text-red-400 hover:border-red-500 hover:bg-red-500/10 rounded-xl transition-all duration-200 disabled:opacity-40"
                      >
                        UNSUB
                        <span className="ml-2 text-[10px] opacity-30 font-normal">
                          U
                        </span>
                      </button>
                    </div>

                    {/* Skip — text only */}
                    <button
                      onClick={() => fetchNext()}
                      className="w-full py-2 text-[11px] uppercase tracking-wide text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                    >
                      SKIP
                      <span className="ml-2 opacity-30">S</span>
                    </button>
                  </div>

                  {/* Footer info */}
                  <div className="mt-10 pt-6 border-t border-[var(--border)] text-center space-y-2">
                    <p className="text-[var(--text-muted)] text-[10px] tracking-[0.15em]">
                      A · R · U · S · ESC
                    </p>
                    {history.length > 0 && (
                      <p className="text-[var(--text-muted)] text-[10px]">
                        {history.length} reviewed this session
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

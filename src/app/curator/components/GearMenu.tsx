"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { CoverageData, HealthData, CuratorTab } from "../types";
import { CoverageBar } from "./CoverageBar";
import { HealthIndicators } from "./HealthIndicators";
import { ImportTools } from "./ImportTools";
import type { useImport } from "../hooks/useImport";

interface GearMenuProps {
  open: boolean;
  onClose: () => void;
  fetchCoverage: () => Promise<CoverageData>;
  fetchHealth: () => Promise<HealthData>;
  fetchStats: () => Promise<void>;
  importProps: ReturnType<typeof useImport>;
  skippedCount: number;
  onReviewSkipped: () => void;
  setActiveTab: (tab: CuratorTab) => void;
}

export function GearMenu({
  open,
  onClose,
  fetchCoverage,
  fetchHealth,
  fetchStats,
  importProps,
  skippedCount,
  onReviewSkipped,
  setActiveTab,
}: GearMenuProps) {
  const [coverage, setCoverage] = useState<CoverageData | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loadingCoverage, setLoadingCoverage] = useState(true);
  const [loadingHealth, setLoadingHealth] = useState(true);
  const [exporting, setExporting] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setLoadingCoverage(true);
    setLoadingHealth(true);
    fetchCoverage().then((d) => {
      setCoverage(d);
      setLoadingCoverage(false);
    });
    fetchHealth().then((d) => {
      setHealth(d);
      setLoadingHealth(false);
    });
  }, [open, fetchCoverage, fetchHealth]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Delay to avoid closing from the gear button click itself
    const timer = setTimeout(() => {
      window.addEventListener("mousedown", handler);
    }, 0);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("mousedown", handler);
    };
  }, [open, onClose]);

  const handleResolveConflict = useCallback(
    async (channelId: string, keep: "approved" | "rejected") => {
      await fetch("/api/curator", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resolveConflict", channelId, keep }),
      });
      fetchCoverage().then(setCoverage);
      fetchHealth().then(setHealth);
      fetchStats();
    },
    [fetchCoverage, fetchHealth, fetchStats]
  );

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const [coverageRes, healthRes] = await Promise.all([
        fetchCoverage(),
        fetchHealth(),
      ]);
      const exportData = {
        exportedAt: new Date().toISOString(),
        total: coverageRes.total,
        approved: coverageRes.segments.approved.count,
        rejected: coverageRes.segments.rejected.count,
        unsub: coverageRes.segments.unsub.count,
        unreviewed: coverageRes.segments.unreviewed.count,
        conflicts: healthRes.conflicts.length,
        noLabels: healthRes.noLabels,
        channels: {
          approved: coverageRes.segments.approved.channels.map((c) => ({
            name: c.name,
            id: c.id,
          })),
          rejected: coverageRes.segments.rejected.channels.map((c) => ({
            name: c.name,
            id: c.id,
          })),
        },
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `curator-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }, [fetchCoverage, fetchHealth]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Panel */}
      <div
        ref={panelRef}
        className="relative w-full max-w-xl bg-[var(--bg)] border-l border-[var(--border)] overflow-y-auto"
      >
        <div className="px-6 py-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--text-secondary)]">
              OPS TOOLS
            </h2>
            <button
              onClick={onClose}
              className="text-[var(--text-muted)] hover:text-[var(--text)] text-lg transition-colors"
            >
              &times;
            </button>
          </div>

          <div className="space-y-8 pb-8">
            {/* Coverage */}
            <section>
              <CoverageBar data={coverage} loading={loadingCoverage} />
            </section>

            {/* Health */}
            <section>
              <h3 className="text-[11px] text-[var(--text-muted)] uppercase tracking-[0.2em] mb-3">
                HEALTH
              </h3>
              <HealthIndicators
                data={health}
                loading={loadingHealth}
                onResolveConflict={handleResolveConflict}
                setActiveTab={setActiveTab}
              />
            </section>

            {/* Import Tools */}
            <section>
              <h3 className="text-[11px] text-[var(--text-muted)] uppercase tracking-[0.2em] mb-3">
                IMPORT
              </h3>
              <ImportTools
                importText={importProps.importText}
                setImportText={importProps.setImportText}
                importing={importProps.importing}
                importResult={importProps.importResult}
                handleImport={importProps.handleImport}
                bookmarks={importProps.bookmarks}
                loadingBookmarks={importProps.loadingBookmarks}
                selectedBookmarks={importProps.selectedBookmarks}
                importedUrls={importProps.importedUrls}
                deleting={importProps.deleting}
                loadBookmarks={importProps.loadBookmarks}
                toggleBookmark={importProps.toggleBookmark}
                selectAllBookmarks={importProps.selectAllBookmarks}
                importSelectedBookmarks={importProps.importSelectedBookmarks}
                deleteFromChrome={importProps.deleteFromChrome}
              />
            </section>

            {/* Actions */}
            <section>
              <h3 className="text-[11px] text-[var(--text-muted)] uppercase tracking-[0.2em] mb-3">
                ACTIONS
              </h3>
              <div className="flex flex-wrap gap-3">
                {skippedCount > 0 && (
                  <button
                    onClick={() => {
                      onReviewSkipped();
                      onClose();
                    }}
                    className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider bg-[var(--bg-alt)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--text-secondary)] rounded-lg transition-all"
                  >
                    RE-QUEUE {skippedCount} SKIPPED
                  </button>
                )}
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider bg-[var(--bg-alt)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--text-secondary)] rounded-lg transition-all disabled:opacity-40"
                >
                  {exporting ? "EXPORTING..." : "EXPORT DATA"}
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import type { HealthData, CuratorTab } from "../types";

interface HealthIndicatorsProps {
  data: HealthData | null;
  loading: boolean;
  onResolveConflict: (channelId: string, keep: "approved" | "rejected") => void;
  setActiveTab: (tab: CuratorTab) => void;
}

export function HealthIndicators({
  data,
  loading,
  onResolveConflict,
  setActiveTab,
}: HealthIndicatorsProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  if (loading || !data) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="animate-pulse h-8 bg-[var(--bg-alt)] rounded-lg"
          />
        ))}
      </div>
    );
  }

  const indicators = [
    {
      key: "conflicts",
      severity: "error" as const,
      count: data.conflicts.length,
      label: "DATA CONFLICT",
      detail:
        data.conflicts.length > 0
          ? data.conflicts.map((c) => `"${c.name}" in approved & rejected`).join(", ")
          : null,
    },
    {
      key: "noLabels",
      severity: "warn" as const,
      count: data.noLabels,
      label: "NO LABELS",
      detail: "Approved channels without genre tags",
    },
    {
      key: "scanErrors",
      severity: "info" as const,
      count: data.scanErrors,
      label: "SCAN ERRORS",
      detail: "Channels where upload fetch failed",
    },
    {
      key: "neverScanned",
      severity: "info" as const,
      count: data.neverScanned,
      label: "NEVER SCANNED",
      detail: "Approved channels never had uploads fetched",
    },
  ];

  const activeIndicators = indicators.filter((i) => i.count > 0);

  if (activeIndicators.length === 0) {
    return (
      <div className="text-[11px] text-emerald-500 uppercase tracking-widest py-2">
        ALL CLEAR — no issues detected
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {activeIndicators.map((ind) => (
        <div key={ind.key}>
          <button
            onClick={() =>
              setExpandedSection(expandedSection === ind.key ? null : ind.key)
            }
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
              ind.severity === "error"
                ? "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                : ind.severity === "warn"
                  ? "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                  : "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
            }`}
          >
            <span className="text-[11px] font-bold">
              {ind.severity === "error"
                ? "[!]"
                : ind.severity === "warn"
                  ? "[!]"
                  : "[i]"}
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider">
              {ind.count} {ind.label}
            </span>
            {ind.detail && (
              <span className="text-[10px] opacity-60 truncate flex-1">
                {ind.detail}
              </span>
            )}
            <span className="text-[10px] opacity-40">
              {expandedSection === ind.key ? "−" : "+"}
            </span>
          </button>

          {expandedSection === ind.key && (
            <div className="mt-2 ml-6 space-y-1">
              {ind.key === "conflicts" &&
                data.conflicts.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 text-xs py-1"
                  >
                    <span className="text-[var(--text)]">{c.name}</span>
                    <button
                      onClick={() => onResolveConflict(c.id, "approved")}
                      className="text-[9px] uppercase tracking-wider text-emerald-500 hover:underline"
                    >
                      KEEP APPROVED
                    </button>
                    <button
                      onClick={() => onResolveConflict(c.id, "rejected")}
                      className="text-[9px] uppercase tracking-wider text-red-400 hover:underline"
                    >
                      KEEP REJECTED
                    </button>
                  </div>
                ))}
              {ind.key === "noLabels" && (
                <button
                  onClick={() => setActiveTab("library")}
                  className="text-[10px] text-amber-400 hover:underline uppercase tracking-wider"
                >
                  Go to Approved &rarr; No Labels filter
                </button>
              )}
              {ind.key === "scanErrors" &&
                data.scanErrorsList.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 text-xs py-1"
                  >
                    <span className="text-[var(--text)]">{c.name}</span>
                    <span className="text-[10px] text-[var(--text-muted)]">
                      {c.issue}
                    </span>
                  </div>
                ))}
              {ind.key === "neverScanned" &&
                data.neverScannedList.slice(0, 20).map((c) => (
                  <div
                    key={c.id}
                    className="text-xs py-0.5 text-[var(--text-muted)]"
                  >
                    {c.name}
                  </div>
                ))}
              {ind.key === "neverScanned" &&
                data.neverScannedList.length > 20 && (
                  <div className="text-[10px] text-[var(--text-muted)]">
                    +{data.neverScannedList.length - 20} more
                  </div>
                )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

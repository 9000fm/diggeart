"use client";

import type { CuratorStats } from "../types";

interface CuratorStatsBarProps {
  stats: CuratorStats | null;
}

export function CuratorStatsBar({ stats }: CuratorStatsBarProps) {
  if (!stats) return null;

  return (
    <div className="flex items-center gap-2 mb-4 text-[11px] font-mono text-[var(--text-muted)] tracking-wider">
      <span className="text-[var(--text)] font-bold">{stats.imported}</span> imported
      <span className="opacity-30">/</span>
      <span className="text-emerald-500 font-bold">{stats.approved}</span> approved
      <span className="opacity-30">/</span>
      <span className="font-bold">{stats.rejected}</span> rejected
      <span className="opacity-30">/</span>
      <span className="text-[var(--text-secondary)] font-bold">{stats.pending}</span> pending
    </div>
  );
}

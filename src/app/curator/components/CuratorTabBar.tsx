"use client";

import type { CuratorTab } from "../types";

interface CuratorTabBarProps {
  activeTab: CuratorTab;
  onChange: (tab: CuratorTab) => void;
  pendingCount?: number;
  rejectedCount?: number;
  filteredCount?: number;
}

export function CuratorTabBar({
  activeTab,
  onChange,
  pendingCount,
  rejectedCount,
  filteredCount,
}: CuratorTabBarProps) {
  const totalRejected = (rejectedCount || 0) + (filteredCount || 0);

  const tabs: { key: CuratorTab; label: string; shortcut: string; badge?: number }[] = [
    { key: "review", label: "Review", shortcut: "1", badge: pendingCount },
    { key: "library", label: "Library", shortcut: "2" },
    { key: "rejected", label: "Rejected", shortcut: "3", badge: totalRejected || undefined },
  ];

  return (
    <div className="flex items-center gap-0 border-b border-[var(--border)] mb-4">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-[0.15em] border-b-2 transition-colors ${
            activeTab === tab.key
              ? "border-[var(--accent)] text-[var(--text)]"
              : "border-transparent text-[var(--text-muted)] hover:text-[var(--text)]"
          }`}
        >
          {tab.label}
          {tab.badge != null && tab.badge > 0 && (
            <span className="ml-1.5 text-[9px] font-bold bg-[var(--bg-alt)] text-[var(--text-secondary)] px-1.5 py-0.5 rounded-full">
              {tab.badge}
            </span>
          )}
          <kbd className="ml-2 text-[9px] font-normal opacity-30 border border-[var(--border)] px-1 py-0.5 rounded-sm">
            {tab.shortcut}
          </kbd>
        </button>
      ))}
    </div>
  );
}

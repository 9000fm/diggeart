"use client";

import type { CuratorTab } from "../types";

interface CuratorTabBarProps {
  activeTab: CuratorTab;
  onChange: (tab: CuratorTab) => void;
  approvedCount?: number;
  reviewCount?: number;
  rejectedCount?: number;
}

export function CuratorTabBar({
  activeTab,
  onChange,
  approvedCount,
  reviewCount,
  rejectedCount,
}: CuratorTabBarProps) {
  const tabs: { key: CuratorTab; label: string; badge?: number; color?: string; shortcut: string }[] = [
    { key: "approved", label: "Approved", badge: approvedCount, color: "text-emerald-500", shortcut: "1" },
    { key: "review", label: "Review", badge: reviewCount, color: "text-[var(--text-secondary)]", shortcut: "2" },
    { key: "rejected", label: "Rejected", badge: rejectedCount, shortcut: "3" },
  ];

  return (
    <div className="flex items-center gap-1 border-b border-[var(--border)] mb-6">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`relative px-5 py-3 text-xs font-bold uppercase tracking-[0.15em] border-b-2 transition-all duration-150 ${
            activeTab === tab.key
              ? "border-[var(--accent)] text-[var(--text)]"
              : "border-transparent text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-alt)]/50"
          }`}
        >
          <kbd className="mr-2 text-[10px] font-normal opacity-70 border border-[var(--text-muted)]/40 px-1.5 py-0.5 rounded-sm">{tab.shortcut}</kbd>
          {tab.label}
          {tab.badge != null && tab.badge > 0 && (
            <span className={`ml-2 text-[9px] font-bold ${tab.color || "text-[var(--text-muted)]"}`}>
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

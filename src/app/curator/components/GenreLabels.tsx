"use client";

import { GENRE_LABELS } from "../types";

interface GenreLabelsProps {
  selected: Set<string>;
  onToggle: (label: string) => void;
}

export function GenreLabels({ selected, onToggle }: GenreLabelsProps) {
  return (
    <div className="mb-2">
      <div className="flex flex-wrap gap-1">
        {GENRE_LABELS.map((label) => (
          <button
            key={label}
            onClick={() => onToggle(label)}
            className={`px-1 text-[7px] rounded-full transition-all duration-150 ${
              selected.has(label)
                ? "bg-[var(--accent)] text-[var(--accent-text)] shadow-sm"
                : "border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--text-secondary)] hover:text-[var(--text)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {selected.size > 0 && (
        <p className="text-[10px] text-[var(--text-muted)] mt-1.5">
          {Array.from(selected).join("  \u00b7  ")}
        </p>
      )}
    </div>
  );
}

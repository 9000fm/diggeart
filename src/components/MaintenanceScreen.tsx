"use client";

const SYMBOLS = "✦ ◇ ⬥ ✧ ◆ ⏣ ";
const SYMBOL_ROW = SYMBOLS.repeat(20);
const ROWS = Array.from({ length: 30 }, () => SYMBOL_ROW);

export default function MaintenanceScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center relative overflow-hidden">
      {/* Background: drifting marquee symbols */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden="true">
        <div
          className="font-mono text-[14px] leading-[2.5] text-[var(--text)] whitespace-pre opacity-[0.03]"
          style={{ animation: "driftDiagonal 40s linear infinite", width: "200%", height: "200%" }}
        >
          {ROWS.map((row, i) => (
            <div key={i}>{row}</div>
          ))}
        </div>
      </div>

      {/* Spinning gem (Y-axis 3D rotation) */}
      <div className="mb-5" style={{ perspective: "400px" }}>
        <svg
          className="w-12 h-12"
          viewBox="0 0 32 32"
          style={{ animation: "gemRotateY 3s ease-in-out infinite", transformStyle: "preserve-3d" }}
        >
          <polygon points="8,4 24,4 30,13 16,29 2,13" fill="currentColor" opacity="0.5" />
          <polygon points="8,4 12,13 16,4" fill="currentColor" opacity="0.35" />
          <polygon points="24,4 20,13 16,4" fill="currentColor" opacity="0.45" />
          <polygon points="2,13 12,13 16,29" fill="currentColor" opacity="0.3" />
          <polygon points="30,13 20,13 16,29" fill="currentColor" opacity="0.2" />
          <polygon points="12,13 20,13 16,29" fill="currentColor" opacity="0.25" />
          <polygon points="12,13 20,13 16,4" fill="currentColor" opacity="0.5" />
        </svg>
      </div>

      {/* Message */}
      <p className="font-mono text-sm text-[var(--text)] uppercase font-bold tracking-wider mb-2 relative z-10">
        We'll be right back.
      </p>
      <div className="flex items-center gap-1.5 relative z-10">
        <span className="w-1 h-1 rounded-full bg-[var(--text-muted)] animate-pulse" />
        <span className="w-1 h-1 rounded-full bg-[var(--text-muted)] animate-pulse" style={{ animationDelay: "0.3s" }} />
        <span className="w-1 h-1 rounded-full bg-[var(--text-muted)] animate-pulse" style={{ animationDelay: "0.6s" }} />
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface UndoToastProps {
  visible: boolean;
  onUndo: () => void;
  trackName?: string;
  duration?: number;
}

export default function UndoToast({ visible, onUndo, trackName = "Track", duration = 5000 }: UndoToastProps) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!visible) {
      setProgress(100);
      return;
    }
    setProgress(100);
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const elapsed = now - start;
      const pct = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(pct);
      if (pct > 0) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [visible, duration]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="fixed left-1/2 -translate-x-1/2 z-50 min-[1152px]:left-[calc(var(--sidebar-width)/2+50%)] bottom-[calc(var(--player-height,0px)+12px)]"
        >
          <div className="flex items-center gap-4 px-5 py-3 bg-[var(--bg-alt)]/90 backdrop-blur-xl border border-[var(--border)]/50 rounded-xl shadow-2xl overflow-hidden">
            {/* Info */}
            <div className="flex flex-col min-w-0">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                Removed from saved
              </span>
              <span className="font-mono text-[12px] text-[var(--text)] truncate max-w-[240px] sm:max-w-[320px]">
                {trackName}
              </span>
            </div>

            {/* Undo button */}
            <button
              onClick={(e) => { e.stopPropagation(); onUndo(); }}
              className="shrink-0 px-3 py-1 font-mono text-[9px] uppercase tracking-wider text-[var(--text)] bg-[var(--text)]/10 hover:bg-[var(--text)]/20 rounded-lg transition-colors cursor-pointer"
            >
              Undo
            </button>
          </div>

          {/* Progress bar along bottom edge */}
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[var(--text)]/5 rounded-b-xl overflow-hidden">
            <motion.div
              className="h-full bg-[var(--text)]/25"
              style={{ width: `${progress}%` }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

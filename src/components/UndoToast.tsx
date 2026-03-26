"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface UndoToastProps {
  visible: boolean;
  onUndo: () => void;
  duration?: number;
}

export default function UndoToast({ visible, onUndo, duration = 5000 }: UndoToastProps) {
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
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onUndo}
          className="fixed bottom-[calc(var(--player-height,0px)+16px)] right-4 lg:right-6 z-50 font-mono text-[12px] uppercase tracking-wider text-white/70 hover:text-white transition-colors cursor-pointer"
        >
          Undo
          <div className="mt-0.5 h-px bg-white/20 w-full">
            <motion.div className="h-full bg-white/50" style={{ width: `${progress}%` }} />
          </div>
        </motion.button>
      )}
    </AnimatePresence>
  );
}

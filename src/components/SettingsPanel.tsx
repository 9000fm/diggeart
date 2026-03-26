"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "./ThemeProvider";

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  anchorRect?: DOMRect | null;
  onRunTutorial?: () => void;
}

export default function SettingsPanel({ open, onClose, anchorRect, onRunTutorial }: SettingsPanelProps) {
  const { theme, toggleTheme } = useTheme();

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);


  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay — subtle */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[70]"
            onClick={onClose}
          />

          {/* Floating card — anchored to gear icon */}
          <div
            className="fixed z-[80] w-[240px]"
            style={
              anchorRect
                ? {
                    top: anchorRect.top - 8,
                    left: anchorRect.right + 12,
                    transform: "translateY(-100%)",
                  }
                : {
                    top: "auto",
                    bottom: 120,
                    left: "50%",
                    transform: "translateX(-50%)",
                  }
            }
          >
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="bg-[var(--bg)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
              <h2 className="font-mono text-[10px] font-bold text-[var(--text)] uppercase tracking-widest">
                Settings
              </h2>
              <button
                onClick={onClose}
                className="w-6 h-6 flex items-center justify-center rounded-full text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-alt)] transition-colors"
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="18" y1="6" x2="6" y2="18" />
                </svg>
              </button>
            </div>

            <div className="px-4 py-3 space-y-3">
              {/* Theme toggle */}
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-[var(--text)]">
                  Theme
                </span>
                <button
                  onClick={toggleTheme}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-alt)] border border-[var(--border)] font-mono text-xs text-[var(--text)] hover:border-[var(--text-muted)] active:scale-95 transition-all duration-100"
                >
                  <span className="text-base">
                    {theme === "light" ? "☀" : "☾"}
                  </span>
                  {theme === "light" ? "Light" : "Dark"}
                </button>
              </div>

              {/* Tutorial */}
              {onRunTutorial && (
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-[var(--text)]">
                    Tutorial
                  </span>
                  <button
                    onClick={() => { onRunTutorial(); onClose(); }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-alt)] border border-[var(--border)] font-mono text-xs text-[var(--text)] hover:border-[var(--text-muted)] active:scale-95 transition-all duration-100"
                  >
                    Run
                  </button>
                </div>
              )}
            </div>


          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

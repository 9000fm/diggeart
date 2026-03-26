"use client";

import { motion, AnimatePresence } from "framer-motion";
import AuthButton from "./AuthButton";

interface WelcomeScreenProps {
  show: boolean;
  onDismiss: () => void;
}

export default function WelcomeScreen({ show, onDismiss }: WelcomeScreenProps) {
  if (!show) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="welcome"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-md"
          onClick={onDismiss}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 28, delay: 0.1 }}
            className="max-w-xs w-full mx-4 bg-black/85 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl px-8 py-8 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-[family-name:var(--font-display)] text-5xl text-white mb-2">digeart</p>
            <p className="font-mono text-sm text-white/50 mb-8">Music discovery for diggers</p>
            <div className="flex justify-center">
              <AuthButton />
            </div>
            <button
              onClick={onDismiss}
              className="mt-6 font-mono text-[11px] text-white/30 hover:text-white/60 transition-colors uppercase tracking-wider"
            >
              Skip for now
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

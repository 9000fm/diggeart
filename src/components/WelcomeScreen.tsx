"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { signIn } from "next-auth/react";

interface WelcomeScreenProps {
  show: boolean;
  onDismiss: () => void;
}

export default function WelcomeScreen({ show, onDismiss }: WelcomeScreenProps) {
  useEffect(() => {
    if (show) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
        document.documentElement.style.overflow = "";
      };
    }
  }, [show]);

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
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-gradient-to-b from-black/90 via-black/40 to-black/90 backdrop-blur-lg"
          onClick={onDismiss}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 28, delay: 0.1 }}
            className="max-w-xs w-full mx-4 px-8 pt-12 pb-8 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-[family-name:var(--font-display)] text-5xl text-white mb-3" style={{ textShadow: "0 0 40px rgba(255,255,255,0.3)" }}>digeart</p>
            <p className="font-mono text-xs text-white/50 mb-8">Music discovery for diggers</p>

            {/* Gem divider */}
            <div className="flex items-center justify-center gap-3 mb-8">
              <div className="flex-1 h-px bg-white/20" />
              <svg className="w-5 h-5 text-white/30" viewBox="0 0 32 32">
                <polygon points="8,4 24,4 30,13 16,29 2,13" fill="currentColor" opacity="0.5" />
                <polygon points="12,13 20,13 16,4" fill="currentColor" opacity="0.4" />
                <polygon points="12,13 20,13 16,29" fill="currentColor" opacity="0.25" />
              </svg>
              <div className="flex-1 h-px bg-white/20" />
            </div>

            {/* Sign in section */}
            <p className="font-mono text-xs text-white/40 mb-4">
              Sign in to save your finds.
            </p>

            <button
              onClick={() => signIn("google")}
              className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-white/10 border border-white/20 rounded-xl font-mono text-xs text-white/80 hover:text-white hover:bg-white/20 active:scale-[0.97] transition-all cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Sign in with Google
            </button>

            {/* Skip */}
            <button
              onClick={onDismiss}
              style={{ marginTop: "2.5rem" }}
              className="font-mono text-[10px] text-white/30 hover:text-white/60 transition-colors uppercase tracking-wider cursor-pointer"
            >
              Skip for now
            </button>

            {/* Version */}
            <p className="mt-4 font-mono text-[9px] text-white/15">
              v{process.env.APP_VERSION}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface OnboardingStep {
  target: string;
  title: string;
  description: string;
}

const STEPS: OnboardingStep[] = [
  {
    target: "[data-card-id]",
    title: "Click to play",
    description: "Click any card to start listening. Press Space to pause.",
  },
  {
    target: ".player-banner",
    title: "The player",
    description: "Play, pause, locate, volume, shuffle \u2014 controls live here. Try N for next, P for previous.",
  },
  {
    target: "aside nav",
    title: "Browse your way",
    description: "Tracks, Samples, Mixes & Saved \u2014 each tab surfaces different music.",
  },
  {
    target: "header input[type='text']",
    title: "Filter by genre",
    description: "Type to find genres \u2014 from Detroit techno to dub.",
  },
  {
    target: ".group\\/about button",
    title: "Info",
    description: "Press (i) or ? for keyboard shortcuts, tab guides, and help.",
  },
  {
    target: ".group\\/gear button",
    title: "Settings",
    description: "Theme, playback preferences, and restart this tutorial.",
  },
];

const MOBILE_STEPS: OnboardingStep[] = [
  {
    target: "[data-card-id]",
    title: "Click to play",
    description: "Click any card to start listening. Press Space to pause.",
  },
  {
    target: ".player-banner",
    title: "The player",
    description: "Play, pause, locate, volume, shuffle \u2014 controls live here. Try N for next, P for previous.",
  },
  {
    target: "[data-mobile-nav]",
    title: "Browse your way",
    description: "Tracks, Samples, Mixes & Saved \u2014 each tab surfaces different music.",
  },
  {
    target: "[data-genre-filter]",
    title: "Filter by genre",
    description: "Type to find genres \u2014 from Detroit techno to dub.",
  },
  {
    target: "[data-auth-button]",
    title: "Your menu",
    description: "Settings, about, and saved tracks \u2014 all inside your profile menu.",
  },
];

interface OnboardingOverlayProps {
  show: boolean;
  onComplete: () => void;
  onPlayRandom?: () => void;
}

export default function OnboardingOverlay({ show, onComplete, onPlayRandom }: OnboardingOverlayProps) {
  const [step, setStep] = useState(0);
  const [spotlight, setSpotlight] = useState<DOMRect | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [spotlightVisible, setSpotlightVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Skip "Info" and "Settings" steps on mobile — targets only exist in desktop sidebar
  const isMobile = typeof window !== "undefined" && window.innerWidth < 1152;
  const isDark = typeof document !== "undefined" && document.documentElement.getAttribute("data-theme") === "dark";
  const steps = isMobile ? MOBILE_STEPS : STEPS;

  // Is this the player step? (index 1 in full steps)
  const isPlayerStep = steps[step]?.target === ".player-banner";

  // Auto-play a random track when reaching the player step (step 2)
  useEffect(() => {
    if (!show || !ready || !onPlayRandom) return;
    if (steps[step]?.target !== ".player-banner") return;
    const t = setTimeout(() => {
      if (!document.querySelector(".player-banner")) {
        onPlayRandom();
      }
    }, 200);
    return () => clearTimeout(t);
  }, [show, ready, step, steps, onPlayRandom]);

  const updateSpotlight = useCallback(() => {
    const selector = steps[step]?.target;
    if (!selector) return;

    const measure = (el: Element) => {
      if (selector === "aside nav" || selector === "[data-mobile-nav]") {
        const buttons = el.querySelectorAll("button");
        if (buttons.length > 0) {
          const first = buttons[0].getBoundingClientRect();
          const last = buttons[buttons.length - 1].getBoundingClientRect();
          setSpotlight(new DOMRect(
            Math.min(first.left, last.left),
            first.top,
            Math.max(first.right, last.right) - Math.min(first.left, last.left),
            last.bottom - first.top
          ));
          return;
        }
      }
      setSpotlight(el.getBoundingClientRect());
    };

    const el = document.querySelector(selector);
    if (el) {
      measure(el);
    } else {
      if (retryRef.current) clearTimeout(retryRef.current);
      let attempts = 0;
      const retry = () => {
        const retryEl = document.querySelector(selector);
        if (retryEl) {
          measure(retryEl);
        } else if (attempts < 5) {
          attempts++;
          retryRef.current = setTimeout(retry, 200);
        } else {
          if (step < steps.length - 1) setStep((s) => s + 1);
          else setSpotlight(null);
        }
      };
      retryRef.current = setTimeout(retry, 200);
    }
  }, [step, steps]);

  useEffect(() => {
    return () => { if (retryRef.current) clearTimeout(retryRef.current); };
  }, []);

  useEffect(() => {
    if (!show || !ready) return;
    const timer = setTimeout(updateSpotlight, 80);
    window.addEventListener("resize", updateSpotlight);
    return () => { clearTimeout(timer); window.removeEventListener("resize", updateSpotlight); };
  }, [show, ready, updateSpotlight]);

  // Watch player element for size changes (minimize/expand on mobile)
  useEffect(() => {
    if (!show || !ready || !isPlayerStep) return;
    const el = document.querySelector(".player-banner");
    if (!el) return;
    const observer = new ResizeObserver(() => updateSpotlight());
    observer.observe(el);
    return () => observer.disconnect();
  }, [show, ready, isPlayerStep, updateSpotlight]);

  // Player step: wait for animation to settle before showing spotlight (single entrance, no blink)
  useEffect(() => {
    if (!show || !ready || !isPlayerStep) return;
    const t = setTimeout(() => {
      updateSpotlight();
      setTimeout(() => setSpotlightVisible(true), 60);
    }, 800);
    return () => clearTimeout(t);
  }, [show, ready, isPlayerStep, updateSpotlight]);

  // After step changes, wait for spotlight to reposition then fade card in (skip player step)
  useEffect(() => {
    if (!show || !ready || isPlayerStep) return;
    const t = setTimeout(() => {
      setSpotlightVisible(true);
    }, 120);
    return () => clearTimeout(t);
  }, [show, ready, step, isPlayerStep]);

  // On tutorial start: scroll to top, then lock body scroll, then mark ready
  useEffect(() => {
    if (!show) {
      setReady(false);
      return;
    }
    setStep(0);
    setShowConfirm(false);
    window.scrollTo({ top: 0, behavior: "instant" });
    const t = setTimeout(() => {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      document.documentElement.style.paddingRight = `${scrollbarWidth}px`;
      setReady(true);
    }, 100);
    return () => {
      clearTimeout(t);
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
      document.documentElement.style.paddingRight = "";
    };
  }, [show]);

  // Block all scroll on Step 1 (touch + wheel)
  useEffect(() => {
    if (!show || !ready || step !== 0) return;
    const preventTouch = (e: TouchEvent) => e.preventDefault();
    const preventWheel = (e: WheelEvent) => e.preventDefault();
    document.addEventListener("touchmove", preventTouch, { passive: false });
    document.addEventListener("wheel", preventWheel, { passive: false });
    return () => {
      document.removeEventListener("touchmove", preventTouch);
      document.removeEventListener("wheel", preventWheel);
    };
  }, [show, ready, step]);

  // Only fade spotlight hole + card between steps — dark backdrop stays
  const goTo = useCallback((next: number) => {
    setSpotlightVisible(false);
    setTimeout(() => setStep(next), 180);
  }, []);

  const handleNext = useCallback(() => {
    if (step >= steps.length - 1) onComplete();
    else goTo(step + 1);
  }, [step, steps.length, onComplete, goTo]);

  const handlePrev = useCallback(() => {
    if (step > 0) goTo(step - 1);
  }, [step, goTo]);

  const handleBackdropClick = useCallback(() => {
    if (step >= steps.length - 1) onComplete();
    else setShowConfirm(true);
  }, [step, steps.length, onComplete]);
  const handleConfirmSkip = useCallback(() => { setShowConfirm(false); onComplete(); }, [onComplete]);
  const handleCancelSkip = useCallback(() => setShowConfirm(false), []);

  // Escape key: dismiss skip dialog if showing, otherwise trigger skip confirm
  useEffect(() => {
    if (!show || !ready) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showConfirm) {
          handleCancelSkip();
        } else {
          handleBackdropClick();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [show, ready, showConfirm, handleCancelSkip, handleBackdropClick]);

  if (!show || !ready) return null;

  const pad = step === 0 ? 10 : 12;
  const r = 24;
  const current = steps[step];
  const isLast = step === steps.length - 1;
  const isFirst = step === 0;

  // Spotlight rect with padding
  const sLeft = spotlight ? spotlight.left - pad : 0;
  const sTop = spotlight ? spotlight.top - pad : 0;
  const sRight = spotlight ? spotlight.right + pad : 0;
  const sBottom = spotlight ? spotlight.bottom + pad : 0;

  // Label positioning
  const isLeftSidebar = !isMobile && spotlight && spotlight.left < 200 && spotlight.width < 300;
  const isBottom = spotlight && spotlight.top > window.innerHeight * 0.6;
  const cardW = 300;
  const labelStyle: React.CSSProperties = spotlight
    ? isMobile
      ? isBottom
        ? {
            position: "fixed",
            bottom: Math.max(16, window.innerHeight - spotlight.top + pad + 12),
            left: Math.max(16, Math.min(
              spotlight.left + spotlight.width / 2 - cardW / 2,
              window.innerWidth - cardW - 16
            )),
            zIndex: 10002,
          }
        : {
            position: "fixed",
            top: Math.min(spotlight.bottom + pad + 12, window.innerHeight - 200),
            left: Math.max(16, Math.min(
              spotlight.left + spotlight.width / 2 - cardW / 2,
              window.innerWidth - cardW - 16
            )),
            zIndex: 10002,
          }
    : isLeftSidebar && isBottom
      ? {
          position: "fixed",
          bottom: Math.max(16, window.innerHeight - spotlight.top + pad + 12),
          left: spotlight.right + pad + 32,
          zIndex: 10002,
        }
      : isLeftSidebar
        ? {
            position: "fixed",
            top: Math.max(16, spotlight.top - 48),
            left: spotlight.right + pad + 32,
            zIndex: 10002,
          }
        : isBottom
          ? {
              position: "fixed",
              bottom: Math.max(16, window.innerHeight - spotlight.top + pad + 12),
              left: Math.max(16, Math.min(
                spotlight.left + spotlight.width / 2 - cardW / 2,
                window.innerWidth - cardW - 16
              )),
              zIndex: 10002,
            }
          : {
              position: "fixed",
              top: Math.min(spotlight.bottom + pad + 12, window.innerHeight - 200),
              left: Math.max(16, Math.min(
                spotlight.left + spotlight.width / 2 - cardW / 2,
                window.innerWidth - cardW - 16
              )),
              zIndex: 10002,
            }
    : { position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 10002 };

  // Canonical button style (matches SettingsPanel)
  const btnBase = "px-3 py-1.5 rounded-lg bg-[var(--bg-alt)] border border-[var(--border)] font-mono text-xs text-[var(--text)] hover:border-[var(--text-muted)] active:scale-95 transition-all duration-100";

  return (
    <>
      {/* Overlay layer */}
      {isPlayerStep && spotlight ? (
        /* Player step: 4 backdrop divs around spotlight — clicks pass through to player */
        <div className="fixed inset-0 z-[10000]" style={{ pointerEvents: "none" }}>
          <div style={{ opacity: spotlightVisible ? 1 : 0, transition: "opacity 160ms ease-out" }}>
            {/* Top */}
            <div
              className="fixed left-0 right-0 top-0"
              style={{ height: Math.max(0, sTop), pointerEvents: "auto", background: isDark ? "rgba(0,0,0,0.85)" : "rgba(0,0,0,0.6)" }}
              onClick={handleBackdropClick}
            />
            {/* Bottom */}
            <div
              className="fixed left-0 right-0 bottom-0"
              style={{ top: sBottom, pointerEvents: "auto", background: isDark ? "rgba(0,0,0,0.85)" : "rgba(0,0,0,0.6)" }}
              onClick={handleBackdropClick}
            />
            {/* Left */}
            <div
              className="fixed left-0"
              style={{ top: sTop, height: sBottom - sTop, width: Math.max(0, sLeft), pointerEvents: "auto", background: isDark ? "rgba(0,0,0,0.85)" : "rgba(0,0,0,0.6)" }}
              onClick={handleBackdropClick}
            />
            {/* Right */}
            <div
              className="fixed right-0"
              style={{ top: sTop, height: sBottom - sTop, left: sRight, pointerEvents: "auto", background: isDark ? "rgba(0,0,0,0.85)" : "rgba(0,0,0,0.6)" }}
              onClick={handleBackdropClick}
            />
            {/* Rounded border overlay for player step */}
            <div
              className="fixed pointer-events-none"
              style={{
                left: sLeft, top: sTop,
                width: sRight - sLeft, height: sBottom - sTop,
                boxShadow: isDark
                  ? "inset 0 0 0 2px rgba(255,255,255,0.2), 0 0 24px 4px rgba(255,255,255,0.05)"
                  : "inset 0 0 0 2px rgba(255,255,255,0.15)",
                borderRadius: 12,
              }}
            />
          </div>
        </div>
      ) : (
        /* All other steps: single overlay with spotlight cutout */
        <div className="fixed inset-0 z-[10000]" onClick={handleBackdropClick}>
          <div style={{ opacity: spotlightVisible ? 1 : 0, transition: "opacity 160ms ease-out" }}>
            {spotlight ? (
              <div
                className="absolute pointer-events-none"
                style={{
                  left: sLeft,
                  top: sTop,
                  width: sRight - sLeft,
                  height: sBottom - sTop,
                  borderRadius: r,
                  boxShadow: isDark
                    ? "0 0 0 9999px rgba(0,0,0,0.85), 0 0 0 2px rgba(255,255,255,0.1), 0 0 24px 4px rgba(255,255,255,0.05)"
                    : "0 0 0 9999px rgba(0,0,0,0.6)",
                }}
              />
            ) : (
              <div className="absolute inset-0" style={{ background: isDark ? "rgba(0,0,0,0.85)" : "rgba(0,0,0,0.6)" }} />
            )}
          </div>
        </div>
      )}

      {/* Step card */}
      <div
        style={{
          ...labelStyle,
          opacity: spotlightVisible ? 1 : 0,
          transform: `${labelStyle.transform || ""} translateY(${spotlightVisible ? "0" : "6px"})`.trim(),
          transition: "opacity 160ms ease-out, transform 160ms ease-out",
          pointerEvents: "auto",
        }}
        className="w-[300px] max-w-[calc(100vw-32px)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`bg-gradient-to-b from-[var(--bg-alt)] to-[var(--bg)] backdrop-blur-xl border rounded-xl shadow-2xl px-5 py-4 ${isDark ? "border-white/10" : "border-[var(--border)]/50"}`}>
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[9px] text-[var(--text-muted)] tracking-wider">
              {step + 1} / {steps.length}
            </span>
            <button
              onClick={handleBackdropClick}
              className="w-5 h-5 flex items-center justify-center text-[var(--text-muted)]/50 hover:text-[var(--text-muted)] transition-colors"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <p className="font-mono text-[13px] text-[var(--text)] font-bold leading-tight uppercase">{current.title}</p>
          <p className="font-mono text-xs text-[var(--text-muted)] mt-1.5 leading-relaxed">{current.description}</p>

          {/* Navigation */}
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={handlePrev}
              disabled={isFirst}
              className={`w-7 h-7 flex items-center justify-center ${btnBase} disabled:opacity-20 disabled:pointer-events-none`}
            >
              <span className="font-mono text-sm">&lt;</span>
            </button>
            <button
              onClick={handleNext}
              className={`${isLast ? "h-7 px-3 font-mono text-[11px]" : "w-7 h-7"} flex items-center justify-center ${btnBase}`}
            >
              {isLast ? "Done" : (
                <span className="font-mono text-sm">&gt;</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Skip confirmation */}
      {showConfirm && (
        <div className="fixed inset-0 z-[10010] flex items-center justify-center" onClick={handleCancelSkip}>
          <div className="absolute inset-0 bg-[var(--bg)]/40" />
          <div
            className="relative bg-[var(--bg-alt)]/95 backdrop-blur-xl border border-[var(--border)]/50 rounded-xl shadow-2xl px-5 py-4 max-w-[260px] w-full text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-mono text-[13px] text-[var(--text)] font-bold uppercase">Skip tutorial?</p>
            <p className="font-mono text-xs text-[var(--text-muted)] mt-1.5">You can restart it anytime from Settings.</p>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleCancelSkip}
                className={`flex-1 py-1.5 ${btnBase} font-medium text-[var(--text)]`}
              >
                Continue
              </button>
              <button
                onClick={handleConfirmSkip}
                className={`flex-1 py-1.5 ${btnBase} font-medium text-[var(--text-muted)]`}
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

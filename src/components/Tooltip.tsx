"use client";

import { useRef, useLayoutEffect, useState, useCallback, type ReactNode } from "react";

export default function Tooltip({ label, children, position = "top", className, show, hoverable = true, delay = 400 }: { label: string; children: ReactNode; position?: "top" | "bottom" | "left" | "right"; className?: string; show?: boolean; hoverable?: boolean; delay?: number }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const [shiftX, setShiftX] = useState(0);
  const [hovered, setHovered] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHorizontal = position === "top" || position === "bottom";

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const tip = tipRef.current;
    if (!wrap || !tip || !isHorizontal) return;

    const wrapRect = wrap.getBoundingClientRect();
    const tipWidth = tip.scrollWidth;
    const centerX = wrapRect.left + wrapRect.width / 2;
    const tipLeft = centerX - tipWidth / 2;
    const tipRight = centerX + tipWidth / 2;
    const pad = 8;

    let shift = 0;
    if (tipRight > window.innerWidth - pad) {
      shift = window.innerWidth - pad - tipRight;
    } else if (tipLeft < pad) {
      shift = pad - tipLeft;
    }
    setShiftX(shift);
  }, [label, isHorizontal]);

  const onEnter = useCallback(() => {
    if (!hoverable) return;
    timerRef.current = setTimeout(() => setHovered(true), delay);
  }, [hoverable, delay]);

  const onLeave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setHovered(false);
  }, []);

  const positionBase = {
    top: "bottom-full left-1/2 mb-2",
    bottom: "top-full left-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  const translateStyle = isHorizontal
    ? { transform: `translateX(calc(-50% + ${shiftX}px))` }
    : undefined;

  const visible = show || hovered;

  return (
    <div ref={wrapRef} className="relative" onMouseEnter={onEnter} onMouseLeave={onLeave}>
      {children}
      <div
        ref={tipRef}
        style={translateStyle}
        className={`absolute ${positionBase[position]} px-2.5 py-1 bg-[var(--text)] text-[var(--bg)] rounded-md font-mono text-[11px] whitespace-nowrap pointer-events-none transition-opacity duration-150 z-50 ${visible ? "opacity-100" : "opacity-0"}${className ? ` ${className}` : ""}`}
      >
        {label}
      </div>
    </div>
  );
}

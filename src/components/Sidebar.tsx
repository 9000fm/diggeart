"use client";

import { useState, useEffect, useRef, useMemo, type ReactNode } from "react";
import { useTheme } from "./ThemeProvider";
import UserMenu from "./UserMenu";

const SEARCH_PHRASES = [
  "detroit techno...",
  "deep house 2000s...",
  "acid house 90s...",
  "uk 1992 rave...",
  "jungle london 1994...",
  "dnb bristol 1997...",
  "ukg 1999...",
  "2 step 2001...",
  "berlin techno 2010s...",
  "minimal 2007...",
  "rominimal 2008...",
  "dub techno 2000s...",
  "germany 2000s techno...",
  "miami bass 1989...",
  "new beat belgium 1989...",
  "ebm 1986...",
  "electroclash 2003...",
  "italo disco 1983...",
  "gabber rotterdam 1995...",
  "goa 1995...",
  "hard trance 1996...",
  "breakbeat hardcore 1993...",
  "old school chicago house...",
  "drum and bass UK...",
  "electro old school...",
  "acid house Chicago...",
  "ambient mix...",
  "idm experimental...",
  "big beat 90s London...",
];

const BANNER_PHRASES = [
  "DIG DEEPER",
  "SUPERSOUNDS FROM THE UNDERGROUND",
  "SUPPORT LOCAL ARTISTS",
  "IT'S ALL ABOUT THE MUSIC",
  "KEEP DIGGING",
  "FEED YOUR EARS",
  "RARE CUTS ONLY",
  "LESS NOISE MORE SOUL",
  "MUSIC IS THE ANSWER",
  "STRAIGHT FROM THE SOURCE",
  "REAL MUSIC FOR REAL PEOPLE",
  "UNDERGROUND NEVER DIES",
];

const GENRE_PRESETS = [
  { label: "All", genres: ["electronic", "house", "techno"] },
  { label: "House", genres: ["house", "deep-house"] },
  { label: "Techno", genres: ["techno", "minimal-techno"] },
  { label: "Electro", genres: ["electro", "detroit-techno"] },
  { label: "Breaks", genres: ["breakbeat", "drum-and-bass"] },
  { label: "Ambient", genres: ["ambient", "idm"] },
  { label: "Dub", genres: ["dub", "dub-techno"] },
  { label: "Disco", genres: ["disco", "funk"] },
];

export type ViewType = "home" | "samples" | "mixes" | "saved";

interface NavItem {
  key: ViewType;
  label: string;
  // Stroke-only (inactive)
  icon: (active: boolean) => ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  {
    key: "home",
    label: "For You",
    icon: (active) => (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 2}>
        {active ? (
          <path d="M12 2.1L1 12h3v9h7v-6h2v6h7v-9h3L12 2.1z" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        )}
      </svg>
    ),
  },
  {
    key: "samples",
    label: "Samples",
    icon: (active) =>
      active ? (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path fillRule="evenodd" clipRule="evenodd"
            d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 8a2 2 0 100 4 2 2 0 000-4z" />
        </svg>
      ) : (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="2" />
        </svg>
      ),
  },
  {
    key: "mixes",
    label: "Mixes",
    icon: (active) =>
      active ? (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <rect x="3" y="10" width="2" height="4" rx="1" />
          <rect x="7" y="6" width="2" height="12" rx="1" />
          <rect x="11" y="4" width="2" height="16" rx="1" />
          <rect x="15" y="8" width="2" height="8" rx="1" />
          <rect x="19" y="7" width="2" height="10" rx="1" />
        </svg>
      ) : (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <line x1="4" y1="10" x2="4" y2="14" />
          <line x1="8" y1="6" x2="8" y2="18" />
          <line x1="12" y1="4" x2="12" y2="20" />
          <line x1="16" y1="8" x2="16" y2="16" />
          <line x1="20" y1="7" x2="20" y2="17" />
        </svg>
      ),
  },
  {
    key: "saved",
    label: "Saved",
    icon: (active) => (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke={active ? "none" : "currentColor"} strokeWidth={2}>
        {active ? (
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
        )}
      </svg>
    ),
  },
];

interface SidebarProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
  activeGenre: number;
  onGenreChange: (index: number) => void;
}

export { GENRE_PRESETS };

function randomPhraseIndex(current: number): number {
  let next: number;
  do {
    next = Math.floor(Math.random() * SEARCH_PHRASES.length);
  } while (next === current && SEARCH_PHRASES.length > 1);
  return next;
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function Sidebar({
  activeView,
  onViewChange,
  activeGenre,
  onGenreChange,
}: SidebarProps) {
  const { theme, toggleTheme } = useTheme();
  const [placeholder, setPlaceholder] = useState("");
  const phraseIndex = useRef(
    Math.floor(Math.random() * SEARCH_PHRASES.length)
  );
  const charIndex = useRef(0);
  const isDeleting = useRef(false);

  const bannerText = useMemo(() => {
    const SEPARATORS = ["✦", "◆", "●", "▲", "■", "♦", "◉", "✧", "♫", "◐", "▸"];
    const shuffled = shuffleArray(BANNER_PHRASES);
    return shuffled
      .map((phrase, i) => {
        const sep = SEPARATORS[Math.floor(Math.random() * SEPARATORS.length)];
        return i < shuffled.length - 1 ? `${phrase}   ${sep}   ` : phrase;
      })
      .join("");
  }, []);

  useEffect(() => {
    const tick = () => {
      const current = SEARCH_PHRASES[phraseIndex.current];
      if (isDeleting.current) {
        charIndex.current--;
        setPlaceholder(current.slice(0, charIndex.current));
        if (charIndex.current === 0) {
          isDeleting.current = false;
          phraseIndex.current = randomPhraseIndex(phraseIndex.current);
        }
      } else {
        charIndex.current++;
        setPlaceholder(current.slice(0, charIndex.current));
        if (charIndex.current === current.length) {
          isDeleting.current = true;
          timer = setTimeout(tick, 1800);
          return;
        }
      }
      timer = setTimeout(tick, isDeleting.current ? 30 : 80);
    };
    let timer = setTimeout(tick, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {/* ===== SCROLLING BANNER ===== */}
      <div className="fixed top-0 left-0 right-0 z-[60] h-[var(--banner-height)] bg-[var(--accent)] text-[var(--accent-text)] overflow-hidden flex items-center">
        <div className="marquee-track inline-flex whitespace-nowrap">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] shrink-0 px-2">
            {bannerText}   ✦
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] shrink-0 px-2">
            {bannerText}   ✦
          </span>
        </div>
      </div>

      {/* ===== DESKTOP: Fixed header bar ===== */}
      <header
        className="hidden lg:flex fixed left-0 right-0 z-50 h-[var(--header-height)] bg-[var(--bg)]/80 backdrop-blur-md backdrop-saturate-150 border-b border-[var(--border)]/50 items-center px-2 gap-4"
        style={{ top: "var(--banner-height)" }}
      >
        <div className="shrink-0 min-w-[var(--sidebar-width)] flex justify-start pl-[5px]">
          <span className="font-[family-name:var(--font-display)] text-4xl text-[var(--text)] tracking-[-0.04em] select-none">
            digeart
          </span>
        </div>

        <div className="flex-1">
          <div className="relative">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
            <input
              type="text"
              placeholder={placeholder}
              disabled
              className="w-full pl-12 pr-4 py-2.5 bg-[var(--bg-alt)] border border-[var(--border)] rounded-xl font-mono text-sm text-[var(--text-secondary)] placeholder:text-[var(--text-muted)] cursor-not-allowed focus:border-[var(--text-secondary)] transition-colors"
            />
          </div>
        </div>

        <div className="shrink-0">
          <UserMenu />
        </div>
      </header>

      {/* ===== DESKTOP: Sidebar below header ===== */}
      <aside
        className="hidden lg:flex fixed left-0 z-40 w-[var(--sidebar-width)] bg-[var(--bg)] border-r border-[var(--border)] text-[var(--text)] flex-col items-center py-4"
        style={{
          top: "calc(var(--banner-height) + var(--header-height))",
          height: "calc(100vh - var(--banner-height) - var(--header-height))",
        }}
      >
        <nav className="flex flex-col items-center flex-1 gap-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive = activeView === item.key;
            return (
              <div key={item.key} className="relative group/nav">
                <button
                  onClick={() => onViewChange(item.key)}
                  className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-200 ${
                    isActive
                      ? "text-[var(--text)] bg-[var(--bg-alt)]"
                      : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-alt)]"
                  }`}
                >
                  {item.icon(isActive)}
                </button>
                {/* Tooltip */}
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-[var(--text)] text-[var(--bg)] rounded-lg font-mono text-xs whitespace-nowrap opacity-0 pointer-events-none group-hover/nav:opacity-100 transition-opacity duration-150 shadow-lg">
                  {item.label}
                </div>
              </div>
            );
          })}
        </nav>
        <button
          onClick={toggleTheme}
          className="w-14 h-14 flex items-center justify-center rounded-xl text-3xl text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-alt)] transition-all duration-200"
        >
          {theme === "light" ? "☀" : "☾"}
        </button>
      </aside>

      {/* ===== MOBILE: Fixed header bar ===== */}
      <header
        className="flex lg:hidden fixed left-0 right-0 z-50 h-14 bg-[var(--bg)]/80 backdrop-blur-md backdrop-saturate-150 border-b border-[var(--border)]/50 items-center px-2 gap-2"
        style={{ top: "var(--banner-height)" }}
      >
        <span className="shrink-0 font-[family-name:var(--font-display)] text-2xl text-[var(--text)] tracking-[-0.02em] select-none">
          digeart
        </span>
        <div className="flex-1 relative">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          <input
            type="text"
            placeholder={placeholder}
            disabled
            className="w-full pl-8 pr-3 py-1.5 bg-[var(--bg-alt)] border border-[var(--border)] rounded-xl font-mono text-xs text-[var(--text-secondary)] placeholder:text-[var(--text-muted)] cursor-not-allowed"
          />
        </div>
        <button
          onClick={toggleTheme}
          className="shrink-0 w-11 h-11 flex items-center justify-center rounded-full text-xl text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-alt)] transition-colors"
        >
          {theme === "light" ? "☀" : "☾"}
        </button>
      </header>

      {/* ===== MOBILE: Nav icons below header ===== */}
      <div
        className="flex lg:hidden fixed left-0 right-0 z-40 h-12 bg-[var(--bg)] border-b border-[var(--border)] items-center justify-evenly px-0"
        style={{ top: "calc(var(--banner-height) + var(--header-height-mobile))" }}
      >
        {NAV_ITEMS.map((item) => {
          const isActive = activeView === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onViewChange(item.key)}
              className={`flex-1 h-full flex items-center justify-center transition-all duration-200 ${
                isActive
                  ? "text-[var(--text)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
            >
              {item.icon(isActive)}
            </button>
          );
        })}
      </div>

    </>
  );
}

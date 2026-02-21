"use client";

import { useState, useEffect, useRef, useMemo, type ReactNode } from "react";
import { useTheme } from "./ThemeProvider";

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
    icon: (active) => (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke={active ? "none" : "currentColor"} strokeWidth={2}>
        {active ? (
          <path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.34A1 1 0 0017.93 1.4L9.428 3.97A1 1 0 008.5 4.93V14" />
        )}
      </svg>
    ),
  },
  {
    key: "mixes",
    label: "Mixes",
    icon: (active) => (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke={active ? "none" : "currentColor"} strokeWidth={2}>
        {active ? (
          <path d="M3 9v6h2V9H3zm4-3v12h2V6H7zm4-2v16h2V4h-2zm4 4v8h2V8h-2zm4-1v10h2V7h-2z" />
        ) : (
          <>
            <path strokeLinecap="round" d="M4 9v6" />
            <path strokeLinecap="round" d="M8 6v12" />
            <path strokeLinecap="round" d="M12 4v16" />
            <path strokeLinecap="round" d="M16 8v8" />
            <path strokeLinecap="round" d="M20 7v10" />
          </>
        )}
      </svg>
    ),
  },
  {
    key: "saved",
    label: "Saved",
    icon: (active) => (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke={active ? "none" : "currentColor"} strokeWidth={2}>
        {active ? (
          <path d="M5 2h14a1 1 0 011 1v19.143a.5.5 0 01-.766.424L12 18.03l-7.234 4.536A.5.5 0 014 22.143V3a1 1 0 011-1z" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [placeholder, setPlaceholder] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const phraseIndex = useRef(
    Math.floor(Math.random() * SEARCH_PHRASES.length)
  );
  const charIndex = useRef(0);
  const isDeleting = useRef(false);

  const bannerText = useMemo(() => {
    const shuffled = shuffleArray(BANNER_PHRASES);
    return shuffled.join("  ✦  ");
  }, []);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

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
            {bannerText}  ✦
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] shrink-0 px-2">
            {bannerText}  ✦
          </span>
        </div>
      </div>

      {/* ===== DESKTOP: Fixed header bar ===== */}
      <header className="hidden lg:flex fixed top-[var(--banner-height)] left-0 right-0 z-50 h-[var(--header-height)] bg-[var(--bg)] border-b border-[var(--border)] items-center px-5 gap-5">
        <span className="shrink-0 font-mono font-black text-2xl text-[var(--text)] uppercase tracking-[0.2em] select-none">
          DIGEART
        </span>

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
          <img
            src="https://api.dicebear.com/7.x/shapes/svg?seed=digeart"
            alt="User"
            className="w-11 h-11 rounded-full bg-[var(--bg-alt)]"
          />
        </div>
      </header>

      {/* ===== DESKTOP: Sidebar below header ===== */}
      <aside className="hidden lg:flex fixed top-[calc(var(--banner-height)+var(--header-height))] left-0 z-40 h-[calc(100vh-var(--banner-height)-var(--header-height))] w-[var(--sidebar-width)] bg-[var(--bg)] border-r border-[var(--border)] text-[var(--text)] flex-col items-center py-4">
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
        <div className="relative w-full flex flex-col items-center gap-1">
          {settingsOpen && (
            <div className="absolute bottom-full mb-2 left-2 bg-[var(--bg)] border border-[var(--border)] rounded-xl p-3 shadow-lg w-48">
              <span className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-widest block mb-3">
                SETTINGS
              </span>
              <button
                onClick={toggleTheme}
                className="w-full flex items-center justify-center px-3 py-2 font-mono text-xl text-[var(--text-secondary)] hover:text-[var(--text)] rounded-lg hover:bg-[var(--bg-alt)] transition-colors"
              >
                {theme === "light" ? "☀" : "☾"}
              </button>
            </div>
          )}
          <div className="relative group/nav">
            <button
              onClick={() => setSettingsOpen(!settingsOpen)}
              className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-200 ${
                settingsOpen
                  ? "text-[var(--text)] bg-[var(--bg-alt)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-alt)]"
              }`}
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-[var(--text)] text-[var(--bg)] rounded-lg font-mono text-xs whitespace-nowrap opacity-0 pointer-events-none group-hover/nav:opacity-100 transition-opacity duration-150 shadow-lg">
              Settings
            </div>
          </div>
        </div>
      </aside>

      {/* ===== MOBILE: Fixed header bar ===== */}
      <header className="flex lg:hidden fixed top-[var(--banner-height)] left-0 right-0 z-50 h-14 bg-[var(--bg)] border-b border-[var(--border)] items-center px-3 gap-3">
        <span className="shrink-0 font-mono font-black text-base text-[var(--text)] uppercase tracking-[0.15em] select-none">
          DIGEART
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
          onClick={() => setMobileOpen(!mobileOpen)}
          className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--bg-alt)] transition-colors"
          aria-label="Menu"
        >
          <span className="font-mono text-sm text-[var(--text)]">
            {mobileOpen ? "X" : "="}
          </span>
        </button>
      </header>

      {/* ===== MOBILE: Nav icons below header ===== */}
      <div className="flex lg:hidden fixed top-[calc(var(--banner-height)+3.5rem)] left-0 right-0 z-40 h-12 bg-[var(--bg)] border-b border-[var(--border)] items-center justify-center gap-1 px-3">
        {NAV_ITEMS.map((item) => {
          const isActive = activeView === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onViewChange(item.key)}
              className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all duration-200 ${
                isActive
                  ? "text-[var(--text)] bg-[var(--bg-alt)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
            >
              {item.icon(isActive)}
            </button>
          );
        })}
        <button
          onClick={toggleTheme}
          className="w-11 h-11 flex items-center justify-center text-xl rounded-xl text-[var(--text-muted)] hover:text-[var(--text)] transition-all duration-200"
          title="Toggle theme"
        >
          {theme === "light" ? "☾" : "☀"}
        </button>
      </div>

      {/* ===== MOBILE: Overlay ===== */}
      <div
        className={`fixed inset-0 z-30 bg-[var(--bg-overlay)] transition-opacity duration-300 lg:hidden ${
          mobileOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setMobileOpen(false)}
      />

      {/* ===== MOBILE: Drawer ===== */}
      <div
        className={`fixed top-[calc(var(--banner-height)+6.5rem)] left-0 right-0 z-30 bg-[var(--bg)] border-b border-[var(--border)] text-[var(--text)] shadow-2xl transition-transform duration-300 ease-out lg:hidden ${
          mobileOpen ? "translate-y-0" : "-translate-y-[200%]"
        }`}
      >
        <div className="p-3">
          <span className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-widest block mb-2">
            GENRE
          </span>
          <div className="flex flex-wrap gap-1.5">
            {GENRE_PRESETS.map((preset, i) => (
              <button
                key={preset.label}
                onClick={() => {
                  onGenreChange(i);
                  setMobileOpen(false);
                }}
                className={`px-3 py-2 font-mono text-xs uppercase rounded-full transition-all duration-200 ${
                  i === activeGenre
                    ? "bg-[var(--accent)] text-[var(--accent-text)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--bg-alt)]"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

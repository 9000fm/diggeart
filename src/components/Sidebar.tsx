"use client";

import { useState, useEffect, useRef, useMemo, useCallback, Fragment, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SettingsPanel from "./SettingsPanel";
import AuthButton from "./AuthButton";
import { GENRE_LABELS } from "@/app/curator/types";

const SEARCH_PHRASES = [
  "House...",
  "Deep House...",
  "Tech House...",
  "Techno...",
  "Minimal...",
  "Rominimal...",
  "Electro...",
  "Breaks...",
  "DnB...",
  "Jungle...",
  "UKG...",
  "Ambient...",
  "Downtempo...",
  "Dub...",
  "Disco...",
  "Funk...",
  "Acid...",
  "Trance...",
  "Industrial...",
  "EBM...",
  "Hip Hop...",
  "Jazz...",
  "Reggae...",
  "Experimental...",
];

const BANNER_PHRASES = [
  "DIGEART — MUSIC DISCOVERY",
  "RARE GROOVES",
  "TRUST YOUR EARS",
  "HIDDEN GEMS DAILY",
  "DIG DEEPER",
  "STRAIGHT FROM THE SOURCE",
  "HUMAN SELECTED",
  "THE UNDERGROUND, CURATED",
  "RARE FINDS",
  "MUSIC FOR DIGGERS",
];

const SEPARATOR_ICONS = ["✦", "◇", "⬥", "✧", "◆", "⏣", "✦"];

const BANNER_TEXT = BANNER_PHRASES.map((phrase, i) => {
  const icon = SEPARATOR_ICONS[i % SEPARATOR_ICONS.length];
  return `${phrase}     ${icon}     `;
}).join("");

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
  icon: (active: boolean) => ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  {
    key: "home",
    label: "For You",
    icon: (active) => (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 2}>
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
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
          <path fillRule="evenodd" clipRule="evenodd"
            d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 8a2 2 0 100 4 2 2 0 000-4z" />
        </svg>
      ) : (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="2" />
        </svg>
      ),
  },
  {
    key: "mixes",
    label: "Mixes",
    icon: (active) => (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
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
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke={active ? "none" : "currentColor"} strokeWidth={2}>
        {active ? (
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
        )}
      </svg>
    ),
  },
];

export type TagFilter = "all" | "hot" | "rare" | "new";

interface SidebarProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
  activeGenre: number;
  onGenreChange: (index: number) => void;
  activeTagFilters: string[];
  onTagFiltersChange: (tags: string[]) => void;
  activeGenreLabels: string[];
  onGenreLabelsChange: (labels: string[]) => void;
  showAbout?: boolean;
  onToggleAbout?: () => void;
  onRunTutorial?: () => void;
}

export { GENRE_PRESETS };

function randomPhraseIndex(current: number): number {
  let next: number;
  do {
    next = Math.floor(Math.random() * SEARCH_PHRASES.length);
  } while (next === current && SEARCH_PHRASES.length > 1);
  return next;
}

// Gear icon SVG
const GearIcon = ({ className }: { className?: string }) => (
  <svg className={className || "w-5 h-5"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const TAG_OPTIONS: { value: TagFilter; label: string; dotColor?: string }[] = [
  { value: "all", label: "All" },
  { value: "hot", label: "Hot", dotColor: "bg-red-500" },
  { value: "rare", label: "Rare", dotColor: "bg-pink-500" },
  { value: "new", label: "New", dotColor: "bg-emerald-500" },
];

export default function Sidebar({
  activeView,
  onViewChange,
  activeGenre,
  onGenreChange,
  activeTagFilters,
  onTagFiltersChange,
  activeGenreLabels,
  onGenreLabelsChange,
  showAbout: showAboutProp,
  onToggleAbout,
  onRunTutorial,
}: SidebarProps) {
  const [placeholder, setPlaceholder] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showAboutLocal, setShowAboutLocal] = useState(false);
  const showAbout = showAboutProp !== undefined ? showAboutProp : showAboutLocal;
  const setShowAbout = onToggleAbout
    ? (v: boolean | ((prev: boolean) => boolean)) => {
        const next = typeof v === "function" ? v(showAbout) : v;
        if (next !== showAbout) onToggleAbout();
      }
    : setShowAboutLocal;
  const [settingsAnchor, setSettingsAnchor] = useState<DOMRect | null>(null);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  const searchDropdownRef = useRef<HTMLDivElement>(null);
  const mobileSearchDropdownRef = useRef<HTMLDivElement>(null);
  const tagDropdownRef = useRef<HTMLDivElement>(null);
  const gearRef = useRef<HTMLButtonElement>(null);
  const aboutRef = useRef<HTMLDivElement>(null);
  const aboutIconRef = useRef<HTMLButtonElement>(null);
  const aboutIdleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [aboutAnchor, setAboutAnchor] = useState<DOMRect | null>(null);
  const [initialPhrase] = useState(() => Math.floor(Math.random() * SEARCH_PHRASES.length));
  const phraseIndex = useRef(initialPhrase);
  const charIndex = useRef(0);
  const isDeleting = useRef(false);
  const typingPaused = useRef(false);

  // Fuzzy-match genre labels against search query
  const genreMatches = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return GENRE_LABELS.filter((label) => label.toLowerCase().includes(q));
  }, [searchQuery]);

  // Lock body scroll when mobile about sheet is open
  useEffect(() => {
    if (showAbout && typeof window !== "undefined" && window.innerWidth < 1152) {
      const scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.width = "";
        document.body.style.overflow = "";
        window.scrollTo(0, scrollY);
      };
    }
  }, [showAbout]);

  // Close About on outside click or Escape
  useEffect(() => {
    if (!showAbout) return;
    const handleClick = (e: MouseEvent) => {
      if (aboutRef.current && !aboutRef.current.contains(e.target as Node)) {
        setShowAbout(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowAbout(false);
    };
    const timer = setTimeout(() => {
      window.addEventListener("mousedown", handleClick);
      window.addEventListener("keydown", handleKey);
    }, 100);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("mousedown", handleClick);
      window.removeEventListener("keydown", handleKey);
    };
  }, [showAbout]);

  // Close tag dropdown on outside click or Escape
  useEffect(() => {
    if (!showTagDropdown) return;
    const handleClick = (e: MouseEvent) => {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(e.target as Node)) {
        setShowTagDropdown(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowTagDropdown(false);
    };
    const timer = setTimeout(() => {
      window.addEventListener("mousedown", handleClick);
      window.addEventListener("keydown", handleKey);
    }, 10);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("mousedown", handleClick);
      window.removeEventListener("keydown", handleKey);
    };
  }, [showTagDropdown]);

  useEffect(() => {
    const tick = () => {
      if (typingPaused.current) {
        timer = setTimeout(tick, 200);
        return;
      }
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
      <div
        className="fixed top-0 left-0 right-0 z-[60] h-[var(--banner-height)] marquee-aurora overflow-hidden flex items-center"
      >
        <div className="marquee-track inline-flex whitespace-nowrap">
          <span className="font-[family-name:var(--font-banner)] text-[13px] font-medium uppercase tracking-[0.3em] shrink-0 px-2">
            {BANNER_TEXT}
          </span>
          <span aria-hidden="true" className="font-[family-name:var(--font-banner)] text-[13px] font-medium uppercase tracking-[0.3em] shrink-0 px-2">
            {BANNER_TEXT}
          </span>
        </div>
      </div>

      {/* ===== DESKTOP: Fixed header bar ===== */}
      <header
        className="hidden min-[1152px]:flex fixed left-0 right-0 z-50 h-[var(--header-height)] bg-[var(--bg)]/80 backdrop-blur-md backdrop-saturate-150 border-b border-[var(--border)]/50 items-center px-4 gap-5"
        style={{ top: "var(--banner-height)" }}
      >
        <div className="shrink-0 min-w-[var(--sidebar-width)] flex justify-start pl-[5px]">
          <span
            className="font-[family-name:var(--font-display)] text-5xl text-[var(--text)] select-none mr-1.5 cursor-pointer"
            onClick={() => { onViewChange("home"); onTagFiltersChange([]); window.scrollTo({ top: 0, behavior: "smooth" }); }}
          >
            digeart
          </span>
        </div>

        <div className="flex-1">
          <div className="relative" ref={tagDropdownRef}>
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)]"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            {/* Genre pills (left) + input + tag pills (right) layered inside */}
            <div className="flex items-center absolute left-12 top-1/2 -translate-y-1/2 z-10 gap-1">
              {activeGenreLabels.map((label) => (
                <span key={label} className="flex items-center gap-1 px-2 py-0.5 bg-[var(--border)] rounded-md font-mono text-[10px] text-[var(--text)] uppercase tracking-wider shrink-0">
                  {label}
                  <button
                    onClick={() => { onGenreLabelsChange(activeGenreLabels.filter((l) => l !== label)); setSearchQuery(""); }}
                    className="w-3.5 h-3.5 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                  >
                    <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
            {/* Tag pills (right, before filter icon) */}
            <div className="flex items-center absolute right-10 top-1/2 -translate-y-1/2 z-10 gap-1">
              {activeTagFilters.map((tag) => {
                const opt = TAG_OPTIONS.find((o) => o.value === tag);
                return opt ? (
                  <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-[var(--border)] rounded-md font-mono text-[10px] text-[var(--text)] uppercase tracking-wider shrink-0">
                    {opt.dotColor && <span className={`w-1.5 h-1.5 rounded-full ${opt.dotColor}`} />}
                    {opt.label}
                    <button
                      onClick={() => onTagFiltersChange(activeTagFilters.filter((t) => t !== tag))}
                      className="w-3.5 h-3.5 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                    >
                      <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </span>
                ) : null;
              })}
            </div>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => { setSearchFocused(true); typingPaused.current = true; }}
              onBlur={() => { setTimeout(() => setSearchFocused(false), 150); typingPaused.current = false; }}
              onKeyDown={(e) => {
                if (e.key === "Escape") { setSearchQuery(""); searchInputRef.current?.blur(); }
                if (e.key === "Enter" && genreMatches.length > 0) {
                  if (!activeGenreLabels.includes(genreMatches[0])) {
                    onGenreLabelsChange([...activeGenreLabels, genreMatches[0]]);
                  }
                  setSearchQuery("");
                  searchInputRef.current?.blur();
                }
              }}
              placeholder={activeGenreLabels.length > 0 || searchFocused ? "" : placeholder}
              style={activeGenreLabels.length > 0 ? { paddingLeft: `${48 + activeGenreLabels.length * 80}px` } : undefined}
              className={`w-full ${activeGenreLabels.length > 0 ? "" : "pl-12"} pr-10 py-2.5 bg-[var(--bg-alt)] border border-[var(--border)] rounded-xl font-mono text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[var(--text-secondary)] focus:outline-none transition-colors`}
            />
            {/* Genre search dropdown — hide already-selected genres */}
            {searchFocused && searchQuery.trim() && genreMatches.filter((l) => !activeGenreLabels.includes(l)).length > 0 && (
              <div ref={searchDropdownRef} className="absolute left-0 right-0 top-full mt-2 bg-[var(--bg-alt)] border border-[var(--border)] rounded-lg shadow-lg z-50 py-1 max-h-60 overflow-y-auto">
                {genreMatches.filter((l) => !activeGenreLabels.includes(l)).map((label) => (
                  <button
                    key={label}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onGenreLabelsChange([...activeGenreLabels, label]);
                      setSearchQuery("");
                      searchInputRef.current?.blur();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 font-mono text-xs uppercase transition-colors duration-150 text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)]/30"
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
            {searchFocused && searchQuery.trim() && genreMatches.filter((l) => !activeGenreLabels.includes(l)).length === 0 && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-[var(--bg-alt)] border border-[var(--border)] rounded-lg shadow-lg z-50 py-3 px-3">
                <p className="font-mono text-xs text-[var(--text-muted)] uppercase text-center">No matching genres</p>
              </div>
            )}
            <button
              onClick={() => setShowTagDropdown((v) => !v)}
              className={`absolute right-3 top-1/2 -translate-y-1/2 flex flex-col items-center justify-center transition-all duration-200 ${activeTagFilters.length > 0 ? "text-[var(--text)] bg-[var(--border)]/70 rounded-md px-1 py-0.5" : "text-[var(--text-secondary)] hover:text-[var(--text)]"}`}
            >
              <svg className={`w-5 h-5 ${showTagDropdown ? "filter-icon-pulse" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={activeTagFilters.length > 0 ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="21" x2="4" y2="14" />
                <line x1="4" y1="10" x2="4" y2="3" />
                <line x1="12" y1="21" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12" y2="3" />
                <line x1="20" y1="21" x2="20" y2="16" />
                <line x1="20" y1="12" x2="20" y2="3" />
                <line x1="1" y1="14" x2="7" y2="14" />
                <line x1="9" y1="8" x2="15" y2="8" />
                <line x1="17" y1="16" x2="23" y2="16" />
              </svg>
            </button>
            {showTagDropdown && (
              <div className="absolute right-0 top-full mt-2 bg-[var(--bg-alt)] border border-[var(--border)] rounded-lg shadow-lg z-50 py-1 min-w-[120px]">
                {TAG_OPTIONS.filter((opt) => opt.value !== "all").map((opt) => {
                  const isActive = activeTagFilters.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      onClick={() => {
                        if (isActive) {
                          onTagFiltersChange(activeTagFilters.filter((t) => t !== opt.value));
                        } else {
                          onTagFiltersChange([...activeTagFilters, opt.value]);
                        }
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 font-mono text-xs uppercase transition-colors duration-150 ${
                        isActive
                          ? "text-[var(--text)] bg-[var(--border)]/50 font-bold border-l-2 border-l-current"
                          : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)]/30 border-l-2 border-l-transparent"
                      }`}
                    >
                      {opt.dotColor && <span className={`w-2 h-2 rounded-full ${opt.dotColor} shrink-0`} />}
                      {opt.label}
                    </button>
                  );
                })}
                {activeTagFilters.length > 0 && (
                  <button
                    onClick={() => { onTagFiltersChange([]); setShowTagDropdown(false); }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 font-mono text-xs uppercase transition-colors duration-150 text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)]/30 border-t border-[var(--border)]/50 mt-1 pt-2"
                  >
                    Clear all
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 mr-1">
          <AuthButton onGoToSaved={() => onViewChange("saved")} />
        </div>
      </header>

      {/* ===== DESKTOP: Sidebar below header ===== */}
      <aside
        className="hidden min-[1152px]:flex fixed left-0 z-40 w-[var(--sidebar-width)] bg-[var(--bg)] border-r border-[var(--border)] text-[var(--text)] flex-col items-center py-4"
        style={{
          top: "calc(var(--banner-height) + var(--header-height))",
          height: "calc(100vh - var(--banner-height) - var(--header-height))",
        }}
      >
        <nav className="flex flex-col items-center flex-1 gap-8">
          {NAV_ITEMS.map((item, i) => {
            const isActive = activeView === item.key;
            return (
              <Fragment key={item.key}>
              <div className="relative group/nav">
                <button
                  onClick={() => { onViewChange(item.key); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  className={`w-12 h-12 flex items-center justify-center rounded-xl cursor-pointer transition-all duration-200 ${
                    isActive
                      ? "text-[var(--text)] bg-[var(--bg-alt)] opacity-100 shadow-sm"
                      : "text-[var(--text-muted)] opacity-60 hover:text-[var(--text)] hover:opacity-100 hover:bg-[var(--bg-alt)]"
                  }`}
                >
                  {item.icon(isActive)}
                </button>
                {/* Tooltip */}
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-[var(--text)] text-[var(--bg)] rounded-md font-mono text-[11px] whitespace-nowrap opacity-0 pointer-events-none group-hover/nav:opacity-100 transition-opacity duration-150 z-50">
                  {item.label} ({i + 1})
                </div>
              </div>
              </Fragment>
            );
          })}
        </nav>
        {/* About & Settings */}
        <div className="flex flex-col items-center gap-4">
        <div
          ref={aboutRef}
          className="relative group/about"
          onMouseEnter={() => { if (aboutIdleTimer.current) { clearTimeout(aboutIdleTimer.current); aboutIdleTimer.current = null; } }}
          onMouseLeave={() => { if (showAbout) { if (aboutIdleTimer.current) clearTimeout(aboutIdleTimer.current); aboutIdleTimer.current = setTimeout(() => setShowAbout(false), 4000); } }}
        >
          <button
            ref={aboutIconRef}
            onClick={() => {
              setAboutAnchor(aboutIconRef.current?.getBoundingClientRect() ?? null);
              setShowAbout((v) => !v);
              setSettingsOpen(false);
            }}
            className="w-12 h-12 flex items-center justify-center rounded-xl text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-alt)] transition-all duration-200"
          >
            <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <circle cx="12" cy="8" r="0.5" fill="currentColor" />
            </svg>
          </button>
          {!showAbout && (
            <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-[var(--text)] text-[var(--bg)] rounded-md font-mono text-[11px] whitespace-nowrap opacity-0 pointer-events-none group-hover/about:opacity-100 transition-opacity duration-150 z-50">
              About
            </div>
          )}
          <AnimatePresence>
            {showAbout && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="fixed px-4 py-3.5 bg-[var(--bg)]/95 backdrop-blur-xl border border-[var(--border)] rounded-xl shadow-2xl z-50 w-[320px] max-h-[calc(100vh-120px)] overflow-y-auto"
                style={aboutAnchor ? {
                  left: aboutAnchor.right + 12,
                  bottom: Math.max(16, window.innerHeight - aboutAnchor.bottom),
                } : undefined}
              >
                <p className="font-[family-name:var(--font-display)] text-2xl text-[var(--text)]">digeart</p>
                <p className="font-mono text-xs text-[var(--text-muted)] mt-0.5">Music discovery for diggers. All human-selected.</p>

                {/* Tag legend */}
                <div className="mt-2.5 pt-2 border-t border-[var(--border)]/50">
                  <p className="font-mono text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider mb-1.5">Tags</p>
                  <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500" /><span className="font-mono text-[10px] text-[var(--text-muted)] font-bold tracking-wider">Hot</span></span>
                    <span className="font-mono text-[10px] text-[var(--text-muted)]">Trending picks</span>
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-pink-500" /><span className="font-mono text-[10px] text-[var(--text-muted)] font-bold tracking-wider">Rare</span></span>
                    <span className="font-mono text-[10px] text-[var(--text-muted)]">Hidden gems</span>
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /><span className="font-mono text-[10px] text-[var(--text-muted)] font-bold tracking-wider">New</span></span>
                    <span className="font-mono text-[10px] text-[var(--text-muted)]">Added recently</span>
                  </div>
                </div>

                {/* Keyboard shortcuts */}
                <div className="mt-2.5 pt-2 border-t border-[var(--border)]/50">
                  <p className="font-mono text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider mb-1.5">Shortcuts</p>
                  <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                    {[
                      ["Space", "Play / Pause"],
                      ["N / \u2192", "Next track"],
                      ["P / \u2190", "Previous track"],
                      ["S", "Toggle shuffle"],
                      ["M", "Mute / Unmute"],
                      ["L", "Locate track"],
                      ["Q", "Toggle queue"],
                      ["1\u20134", "Switch tab"],
                      ["?", "Toggle this panel"],
                    ].map(([key, desc]) => (
                      <Fragment key={key}>
                        <kbd className="font-mono text-[9px] text-[var(--text)] font-bold bg-[var(--border)]/40 px-1 py-px rounded text-center min-w-[22px]">{key}</kbd>
                        <span className="font-mono text-[10px] text-[var(--text-muted)]">{desc}</span>
                      </Fragment>
                    ))}
                  </div>
                </div>

                {/* Navigation guide */}
                <div className="mt-2.5 pt-2 border-t border-[var(--border)]/50">
                  <p className="font-mono text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider mb-1.5">Tabs</p>
                  <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                    {[
                      ["For You", "1", "Electronic cuts from the underground"],
                      ["Samples", "2", "World, funk, jazz, ambient & rare finds"],
                      ["Mixes", "3", "DJ sets & live sets"],
                      ["Saved", "4", "Your liked tracks"],
                    ].map(([tab, key, desc]) => (
                      <Fragment key={tab}>
                        <span className="font-mono text-[10px] text-[var(--text-secondary)] font-bold shrink-0">{tab} <kbd className="font-mono text-[9px] text-[var(--text-muted)] font-bold">({key})</kbd></span>
                        <span className="font-mono text-[10px] text-[var(--text-muted)]">{desc}</span>
                      </Fragment>
                    ))}
                  </div>
                </div>

                <p className="mt-2.5 pt-2 border-t border-[var(--border)]/50 font-mono text-[10px] text-[var(--text-muted)] leading-relaxed">
                  All tracks are property of their respective owners and rights holders. This platform does not claim ownership of any content.
                </p>

                <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[var(--border)]/50">
                  <span className="font-mono text-[10px] text-[var(--text-muted)] flex items-center gap-1"><svg className="w-4 h-4 shrink-0 -mt-px" viewBox="0 0 32 32"><polygon points="8,4 24,4 30,13 16,29 2,13" fill="currentColor" opacity="0.5"/><polygon points="8,4 12,13 16,4" fill="currentColor" opacity="0.35"/><polygon points="24,4 20,13 16,4" fill="currentColor" opacity="0.45"/><polygon points="2,13 12,13 16,29" fill="currentColor" opacity="0.3"/><polygon points="30,13 20,13 16,29" fill="currentColor" opacity="0.2"/><polygon points="12,13 20,13 16,29" fill="currentColor" opacity="0.25"/><polygon points="12,13 20,13 16,4" fill="currentColor" opacity="0.5"/></svg>a <a href="https://superself.online" target="_blank" rel="noopener noreferrer" className="font-bold text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors">superself</a> project</span>
                  <span className="font-mono text-[9px] text-[var(--text-muted)]">v{process.env.APP_VERSION}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="relative group/gear">
          <button
            ref={gearRef}
            onClick={() => {
              setSettingsAnchor(gearRef.current?.getBoundingClientRect() ?? null);
              setSettingsOpen(true);
              setShowAbout(false);
            }}
            className="w-12 h-12 flex items-center justify-center rounded-xl text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-alt)] transition-all duration-200"
          >
            <GearIcon className="w-7 h-7" />
          </button>
          <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-[var(--text)] text-[var(--bg)] rounded-md font-mono text-[11px] whitespace-nowrap opacity-0 pointer-events-none group-hover/gear:opacity-100 transition-opacity duration-150 z-50">
            Settings
          </div>
        </div>
        </div>
      </aside>

      {/* ===== MOBILE: Fixed header bar ===== */}
      <header
        className="flex min-[1152px]:hidden fixed left-0 right-0 z-50 h-[72px] bg-[var(--bg)] border-b border-[var(--border)]/30 items-center px-3 gap-3"
        style={{ top: "var(--banner-height)" }}
      >
        <span
          className="shrink-0 font-[family-name:var(--font-display)] text-5xl text-[var(--text)] select-none mr-1 cursor-pointer"
          onClick={() => { onViewChange("home"); onTagFiltersChange([]); window.scrollTo({ top: 0, behavior: "smooth" }); }}
        >
          digeart
        </span>
        <div data-genre-filter className="flex-1 relative">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-secondary)]"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          {/* Mobile genre pills */}
          <div className="flex items-center absolute left-8 top-1/2 -translate-y-1/2 z-10 gap-0.5">
            {activeGenreLabels.map((label) => (
              <span key={label} className="flex items-center gap-0.5 px-1.5 py-0.5 bg-[var(--border)] rounded-md font-mono text-[10px] text-[var(--text)] uppercase shrink-0">
                {label}
                <button
                  onClick={() => { onGenreLabelsChange(activeGenreLabels.filter((l) => l !== label)); setSearchQuery(""); }}
                  className="w-3 h-3 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                >
                  <svg className="w-2 h-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
          {/* Mobile tag pills */}
          <div className="flex items-center absolute right-8 top-1/2 -translate-y-1/2 z-10 gap-0.5">
            {activeTagFilters.map((tag) => {
              const opt = TAG_OPTIONS.find((o) => o.value === tag);
              return opt ? (
                <span key={tag} className="flex items-center gap-0.5 px-1.5 py-0.5 bg-[var(--border)] rounded-md font-mono text-[10px] text-[var(--text)] uppercase shrink-0">
                  {opt.dotColor && <span className={`w-1.5 h-1.5 rounded-full ${opt.dotColor}`} />}
                  {opt.label}
                  <button
                    onClick={() => onTagFiltersChange(activeTagFilters.filter((t) => t !== tag))}
                    className="w-3 h-3 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                  >
                    <svg className="w-2 h-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </span>
              ) : null;
            })}
          </div>
          <input
            ref={mobileSearchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => { setSearchFocused(true); typingPaused.current = true; }}
            onBlur={() => { setTimeout(() => setSearchFocused(false), 150); typingPaused.current = false; }}
            onKeyDown={(e) => {
              if (e.key === "Escape") { setSearchQuery(""); mobileSearchInputRef.current?.blur(); }
              if (e.key === "Enter" && genreMatches.length > 0) {
                if (!activeGenreLabels.includes(genreMatches[0])) {
                  onGenreLabelsChange([...activeGenreLabels, genreMatches[0]]);
                }
                setSearchQuery("");
                mobileSearchInputRef.current?.blur();
              }
            }}
            placeholder={activeGenreLabels.length > 0 || searchFocused ? "" : placeholder}
            style={activeGenreLabels.length > 0 ? { paddingLeft: `${32 + activeGenreLabels.length * 70}px` } : undefined}
            className={`w-full ${activeGenreLabels.length > 0 ? "" : "pl-8"} pr-8 py-1.5 bg-[var(--bg-alt)] border border-[var(--border)] rounded-xl font-mono text-xs text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[var(--text-secondary)] focus:outline-none transition-colors`}
          />
          {/* Mobile genre search dropdown */}
          {searchFocused && searchQuery.trim() && genreMatches.filter((l) => !activeGenreLabels.includes(l)).length > 0 && (
            <div ref={mobileSearchDropdownRef} className="absolute left-0 right-0 top-full mt-1.5 bg-[var(--bg-alt)] border border-[var(--border)] rounded-lg shadow-lg z-50 py-1 max-h-48 overflow-y-auto">
              {genreMatches.filter((l) => !activeGenreLabels.includes(l)).map((label) => (
                <button
                  key={label}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onGenreLabelsChange([...activeGenreLabels, label]);
                    setSearchQuery("");
                    mobileSearchInputRef.current?.blur();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 font-mono text-[11px] uppercase transition-colors duration-150 text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)]/30"
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          {searchFocused && searchQuery.trim() && genreMatches.filter((l) => !activeGenreLabels.includes(l)).length === 0 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-[var(--bg-alt)] border border-[var(--border)] rounded-lg shadow-lg z-50 py-2 px-3">
              <p className="font-mono text-[10px] text-[var(--text-muted)] uppercase text-center">No matching genres</p>
            </div>
          )}
          <button
            onClick={() => setShowTagDropdown((v) => !v)}
            className={`absolute right-2.5 top-1/2 -translate-y-1/2 flex flex-col items-center justify-center transition-all duration-200 ${activeTagFilters.length > 0 ? "text-[var(--text)] bg-[var(--border)]/70 rounded-md px-0.5 py-0.5" : "text-[var(--text-secondary)] hover:text-[var(--text)]"}`}
          >
            <svg className={`w-4 h-4 ${showTagDropdown ? "filter-icon-pulse" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={activeTagFilters.length > 0 ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="21" x2="4" y2="14" />
              <line x1="4" y1="10" x2="4" y2="3" />
              <line x1="12" y1="21" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12" y2="3" />
              <line x1="20" y1="21" x2="20" y2="16" />
              <line x1="20" y1="12" x2="20" y2="3" />
              <line x1="1" y1="14" x2="7" y2="14" />
              <line x1="9" y1="8" x2="15" y2="8" />
              <line x1="17" y1="16" x2="23" y2="16" />
            </svg>
          </button>
          {showTagDropdown && (
            <div className="absolute right-0 top-full mt-1.5 bg-[var(--bg-alt)] border border-[var(--border)] rounded-lg shadow-lg z-50 py-1 min-w-[110px]">
              {TAG_OPTIONS.filter((opt) => opt.value !== "all").map((opt) => {
                const isActive = activeTagFilters.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    onClick={() => {
                      if (isActive) {
                        onTagFiltersChange(activeTagFilters.filter((t) => t !== opt.value));
                      } else {
                        onTagFiltersChange([...activeTagFilters, opt.value]);
                      }
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 font-mono text-[11px] uppercase transition-colors duration-150 ${
                      isActive
                        ? "text-[var(--text)] bg-[var(--border)]/50 font-bold border-l-2 border-l-current"
                        : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)]/30 border-l-2 border-l-transparent"
                    }`}
                  >
                    {opt.dotColor && <span className={`w-1.5 h-1.5 rounded-full ${opt.dotColor} shrink-0`} />}
                    {opt.label}
                  </button>
                );
              })}
              {activeTagFilters.length > 0 && (
                <button
                  onClick={() => { onTagFiltersChange([]); setShowTagDropdown(false); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 font-mono text-[11px] uppercase transition-colors duration-150 text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)]/30 border-t border-[var(--border)]/50 mt-1 pt-2"
                >
                  Clear all
                </button>
              )}
            </div>
          )}
        </div>
        <div data-auth-button className="shrink-0">
          <AuthButton mobile onGoToSaved={() => onViewChange("saved")} onOpenSettings={() => { const el = document.querySelector('[data-auth-button]'); setSettingsAnchor(el?.getBoundingClientRect() ?? null); setSettingsOpen(true); setShowAbout(false); }} onOpenInfo={() => { setShowAbout((v) => !v); setSettingsOpen(false); }} />
        </div>
      </header>

      {/* ===== MOBILE: Nav icons below header ===== */}
      <div
        data-mobile-nav
        className="flex min-[1152px]:hidden fixed left-0 right-0 z-40 h-16 bg-[var(--bg)] border-b border-[var(--border)] items-center justify-evenly px-0"
        style={{ top: "calc(var(--banner-height) + var(--header-height-mobile))" }}
      >
        {NAV_ITEMS.map((item, i) => {
          const isActive = activeView === item.key;
          return (
            <Fragment key={item.key}>
              <button
                onClick={() => { onViewChange(item.key); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                className={`w-12 h-12 flex items-center justify-center rounded-xl cursor-pointer transition-all duration-200 ${
                  isActive
                    ? "text-[var(--text)] bg-[var(--bg-alt)] opacity-100 shadow-sm"
                    : "text-[var(--text-muted)] opacity-60 hover:text-[var(--text)] hover:opacity-100 hover:bg-[var(--bg-alt)]"
                }`}
              >
                {item.icon(isActive)}
              </button>
            </Fragment>
          );
        })}
      </div>

      {/* Mobile/Tablet About overlay — renders outside aside so it's visible on <lg */}
      <AnimatePresence>
        {showAbout && (
          <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="min-[1152px]:hidden fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm"
            style={{ touchAction: "none" }}
            onClick={() => setShowAbout(false)}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="min-[1152px]:hidden fixed bottom-0 left-0 right-0 max-h-[80vh] overflow-y-auto bg-[var(--bg)] border-t border-[var(--border)] rounded-t-2xl shadow-2xl px-5 py-4 z-[71]"
            style={{ touchAction: "pan-y" }}
            onTouchMove={(e) => e.stopPropagation()}
            >
              {/* Drag handle */}
              <div className="w-10 h-1 rounded-full bg-[var(--border)] mx-auto mb-3" />

              <p className="font-[family-name:var(--font-display)] text-2xl text-[var(--text)]">digeart</p>
              <p className="font-mono text-xs text-[var(--text-muted)] mt-0.5">Music discovery for diggers. All human-selected.</p>

              {/* Tag legend */}
              <div className="mt-2.5 pt-2 border-t border-[var(--border)]/50">
                <p className="font-mono text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider mb-1.5">Tags</p>
                <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500" /><span className="font-mono text-[10px] text-[var(--text-muted)] font-bold tracking-wider">Hot</span></span>
                  <span className="font-mono text-[10px] text-[var(--text-muted)]">Trending picks</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-pink-500" /><span className="font-mono text-[10px] text-[var(--text-muted)] font-bold tracking-wider">Rare</span></span>
                  <span className="font-mono text-[10px] text-[var(--text-muted)]">Hidden gems</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /><span className="font-mono text-[10px] text-[var(--text-muted)] font-bold tracking-wider">New</span></span>
                  <span className="font-mono text-[10px] text-[var(--text-muted)]">Added recently</span>
                </div>
              </div>

              {/* Navigation guide */}
              <div className="mt-2.5 pt-2 border-t border-[var(--border)]/50">
                <p className="font-mono text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider mb-1.5">Tabs</p>
                <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                  {[
                    ["For You", "1", "Electronic cuts from the underground"],
                    ["Samples", "2", "World, funk, jazz, ambient & rare finds"],
                    ["Mixes", "3", "DJ sets & live sets"],
                    ["Saved", "4", "Your liked tracks"],
                  ].map(([tab, key, desc]) => (
                    <Fragment key={tab}>
                      <span className="font-mono text-[10px] text-[var(--text-secondary)] font-bold shrink-0">{tab} <kbd className="font-mono text-[9px] text-[var(--text-muted)] font-bold">({key})</kbd></span>
                      <span className="font-mono text-[10px] text-[var(--text-muted)]">{desc}</span>
                    </Fragment>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[var(--border)]/50">
                <span className="font-mono text-[10px] text-[var(--text-muted)] flex items-center gap-1"><svg className="w-4 h-4 shrink-0 -mt-px" viewBox="0 0 32 32"><polygon points="8,4 24,4 30,13 16,29 2,13" fill="currentColor" opacity="0.5"/><polygon points="8,4 12,13 16,4" fill="currentColor" opacity="0.35"/><polygon points="24,4 20,13 16,4" fill="currentColor" opacity="0.45"/><polygon points="2,13 12,13 16,29" fill="currentColor" opacity="0.3"/><polygon points="30,13 20,13 16,29" fill="currentColor" opacity="0.2"/><polygon points="12,13 20,13 16,29" fill="currentColor" opacity="0.25"/><polygon points="12,13 20,13 16,4" fill="currentColor" opacity="0.5"/></svg>a <a href="https://superself.online" target="_blank" rel="noopener noreferrer" className="font-bold text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors">superself</a> project</span>
                <span className="font-mono text-[9px] text-[var(--text-muted)]">v{process.env.APP_VERSION}</span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Settings Panel */}
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} anchorRect={settingsAnchor} onRunTutorial={onRunTutorial} />
    </>
  );
}

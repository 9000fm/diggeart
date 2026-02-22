"use client";

import { useSession, signIn, signOut } from "next-auth/react";

export default function UserMenu() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="w-11 h-11 rounded-full bg-[var(--bg-alt)] animate-pulse" />
    );
  }

  if (!session) {
    return (
      <button
        onClick={() => signIn("google")}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--bg-alt)] border border-[var(--border)] hover:border-[var(--text-secondary)] transition-colors"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        <span className="font-mono text-xs text-[var(--text-secondary)]">Sign in</span>
      </button>
    );
  }

  return (
    <div className="relative group/user">
      <button className="flex items-center gap-2">
        {session.user?.image ? (
          <img
            src={session.user.image}
            alt={session.user.name || "User"}
            className="w-11 h-11 rounded-full bg-[var(--bg-alt)] border-2 border-transparent hover:border-[var(--accent)] transition-colors"
          />
        ) : (
          <div className="w-11 h-11 rounded-full bg-[var(--accent)] text-[var(--accent-text)] flex items-center justify-center font-mono text-sm font-bold">
            {session.user?.name?.[0]?.toUpperCase() || "?"}
          </div>
        )}
      </button>
      {/* Dropdown */}
      <div className="absolute right-0 top-full mt-2 w-48 bg-[var(--bg-alt)] border border-[var(--border)] rounded-xl shadow-lg opacity-0 pointer-events-none group-hover/user:opacity-100 group-hover/user:pointer-events-auto transition-opacity duration-150 z-50 p-2">
        <p className="font-mono text-xs text-[var(--text)] px-3 py-1.5 truncate">
          {session.user?.name}
        </p>
        <p className="font-mono text-[10px] text-[var(--text-muted)] px-3 pb-2 truncate">
          {session.user?.email}
        </p>
        <hr className="border-[var(--border)] my-1" />
        <button
          onClick={() => signOut()}
          className="w-full text-left font-mono text-xs text-[var(--text-secondary)] hover:text-[var(--text)] px-3 py-1.5 rounded-lg hover:bg-[var(--bg)] transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

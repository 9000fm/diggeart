# digeart

Pinterest-style music discovery powered by Spotify + YouTube. Preview tracks, explore by genre, watch DJ sets and sample packs.

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment

Create `.env.local` with your own keys:

```
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
YOUTUBE_API_KEY=
```

Spotify uses **Client Credentials** flow (no user login needed). YouTube uses a standard Data API v3 key.

## Architecture

```
src/
  app/
    page.tsx              # Main layout, persistent audio, view switching
    globals.css           # CSS variables, theme, animations
    api/
      discover/route.ts   # Spotify search + YouTube channel discovery
      mixes/route.ts      # Long-form DJ sets (>40min)
      samples/route.ts    # Short-form samples (<15min, niche channels)
      curator/route.ts    # Channel review (approve/reject/undo)
    curator/page.tsx      # Channel curation UI
  components/
    Sidebar.tsx           # Nav, genre filters, banner, search, theme toggle
    DiscoverGrid.tsx      # Infinite-scroll card grid with genre presets
    MixesGrid.tsx         # DJ sets grid
    SamplesGrid.tsx       # Samples grid
    MusicCard.tsx         # Album art, metadata, play/save controls
    NowPlayingBanner.tsx  # Persistent player bar with progress, seek, album art
  lib/
    spotify.ts            # Spotify Client Credentials auth + search + audio features
    youtube.ts            # YouTube Data API helpers
    types.ts              # Shared CardData type
  data/
    music-channels.json   # All imported YouTube channels
    approved-channels.json
    rejected-channels.json
```

## Features

- Genre filter tabs (House, Techno, Electro, Breaks, Ambient, Dub, Disco)
- Spotify track search with 30s audio previews, progress bar + seeking
- YouTube inline embed player
- Persistent audio playback across view switches
- Now-playing banner with album art, EQ visualizer, seek bar
- Infinite scroll (30 cards/page)
- Samples grid (short-form from curated YouTube channels)
- Mixes grid (long-form DJ sets)
- Like/Save toggles
- Dark/Light theme (Space Mono typography)
- Curator page with keyboard shortcuts (A/R/U/S/B) + undo
- Chrome bookmarks import for channel discovery

## Stack

- Next.js 16 + TypeScript
- Tailwind CSS v4
- Spotify Web API (Client Credentials)
- YouTube Data API v3

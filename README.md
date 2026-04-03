# digeart

Deep cuts from curated underground channels. All human-selected.

**[digeart.vercel.app](https://digeart.vercel.app)**

## Features

- Multi-genre & multi-tag filtering (Hot, Rare, New)
- YouTube-powered playback with persistent player
- Curated underground channels
- Samples, mixes & DJ sets
- Dark/light themes
- Google auth + saved tracks
- Keyboard shortcuts

## How it works

1. Browse curated tracks across **For You**, **Samples**, and **Mixes** tabs
2. Filter by genre (House, Techno, Breaks...) and tags (Hot, Rare, New)
3. Click any card to play — controls, seek, and volume live in the player bar
4. Sign in with Google to save tracks and sync across devices
5. Press `?` for keyboard shortcuts

## Under the hood

- Daily shuffled track pool for fresh discovery
- Curated channel pipeline with approve/reject workflow
- Tag engine based on YouTube metadata
- Single-iframe player for seamless playback

## Roadmap

- [ ] Multi-curator support (invite other diggers to curate)
- [ ] Social follows (follow curators, personalized feeds)
- [ ] Discogs integration (label discovery, release metadata, rarity)
- [ ] Playlist export

## Stack

Next.js 16 / TypeScript / Tailwind CSS v4 / YouTube Data API / Supabase / NextAuth

## Setup

```bash
npm install
npm run dev
```

## Contributing

This is a personal project in active development. If you have ideas or want to contribute, open an issue or reach out.

---

a [superself](https://superself.online) project — v1.5.3-beta

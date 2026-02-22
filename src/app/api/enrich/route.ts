import { NextResponse } from "next/server";
import { searchArtistGenres as mbSearch } from "@/lib/musicbrainz";
import { searchArtistGenres as discogsSearch } from "@/lib/discogs";
import approvedChannels from "@/data/approved-channels.json";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const CACHE_PATH = join(process.cwd(), "src/data/genre-cache.json");

interface GenreCacheEntry {
  mbGenres: string[];
  mbTags: string[];
  discogsGenres: string[];
  discogsStyles: string[];
  channelLabels: string[];
  fetchedAt: string;
}

interface GenreCache {
  [key: string]: GenreCacheEntry;
}

function loadCache(): GenreCache {
  if (existsSync(CACHE_PATH)) {
    return JSON.parse(readFileSync(CACHE_PATH, "utf-8"));
  }
  return {};
}

function saveCache(cache: GenreCache) {
  writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
}

/**
 * GET /api/enrich?limit=5&source=discogs|musicbrainz|both
 * 
 * Enriches channels with genre data from MusicBrainz and/or Discogs.
 * Uses CHANNEL NAME as the artist lookup (more reliable than video title parsing).
 * Results cached in genre-cache.json.
 * 
 * Discogs needs DISCOGS_TOKEN in .env.local (free from discogs.com/settings/developers)
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") || 5), 20);
  const source = url.searchParams.get("source") || "both";

  const cache = loadCache();
  const newResults: {
    channel: string;
    discogsStyles: string[];
    discogsGenres: string[];
    mbGenres: string[];
    mbTags: string[];
  }[] = [];

  // Find channels not yet cached
  const uncached = (approvedChannels as { name: string; id: string; labels?: string[] }[])
    .filter((ch) => !cache[ch.id]);

  const toProcess = uncached.slice(0, limit);

  for (const ch of toProcess) {
    const entry: GenreCacheEntry = {
      mbGenres: [],
      mbTags: [],
      discogsGenres: [],
      discogsStyles: [],
      channelLabels: ch.labels || [],
      fetchedAt: new Date().toISOString(),
    };

    // Discogs lookup (faster rate limit: 240/min)
    if (source === "discogs" || source === "both") {
      try {
        const discogs = await discogsSearch(ch.name);
        if (discogs) {
          entry.discogsGenres = discogs.genres;
          entry.discogsStyles = discogs.styles;
        }
      } catch (e) {
        console.error(`Discogs failed for "${ch.name}":`, e);
      }
    }

    // MusicBrainz lookup (1 req/sec — slower)
    if (source === "musicbrainz" || source === "both") {
      try {
        const mb = await mbSearch(ch.name);
        if (mb) {
          entry.mbGenres = mb.genres;
          entry.mbTags = mb.tags.map((t) => t.name).slice(0, 10);
        }
      } catch (e) {
        console.error(`MusicBrainz failed for "${ch.name}":`, e);
      }
    }

    cache[ch.id] = entry;

    newResults.push({
      channel: ch.name,
      discogsStyles: entry.discogsStyles,
      discogsGenres: entry.discogsGenres,
      mbGenres: entry.mbGenres,
      mbTags: entry.mbTags,
    });

    // Small delay between channels
    await new Promise((r) => setTimeout(r, 300));
  }

  saveCache(cache);

  return NextResponse.json({
    processed: newResults.length,
    remaining: uncached.length - toProcess.length,
    cached: Object.keys(cache).length,
    totalChannels: approvedChannels.length,
    results: newResults,
  });
}

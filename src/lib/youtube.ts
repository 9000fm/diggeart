import musicChannels from "@/data/music-channels.json";
import approvedChannels from "@/data/approved-channels.json";
import { cacheGet, cacheSet } from "./cache";
import type { CardData } from "./types";

const API_KEY = process.env.YOUTUBE_API_KEY!;
const YT_API = "https://www.googleapis.com/youtube/v3";

interface YouTubeVideo {
  id: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  width: number;
  height: number;
  duration: number | null;
}

const NON_MUSIC_KEYWORDS = [
  // tutorials & education
  "tutorial", "how to", "how-to", "walkthrough", "explained",
  "lesson", "masterclass", "course", "learn to",
  "piano lesson", "music theory", "chord progression", "beginner", "practice",
  // production / DAW content
  "fl studio", "ableton", "logic pro", "bitwig", "pro tools",
  "making a beat", "beat making", "beatmaking", "sound design tutorial",
  "preset pack", "sample pack review", "plugin review",
  // gear & reviews
  "gear review", "unboxing", "studio tour", "setup tour",
  "vs comparison", "synth review", "midi controller",
  // covers & non-original
  "cover)", "cover]", "(cover", "[cover",
  "piano cover", "guitar cover", "drum cover", "vocal cover",
  "acoustic cover", "ukulele cover",
  // reactions & commentary
  "reaction", "reacting to", "first time hearing",
  "review:", "album review", "track review",
  // vlogs & non-music
  "vlog", "q&a", "q & a", "behind the scenes",
  "day in the life", "studio vlog",
];

function isNonMusic(title: string): boolean {
  const lower = title.toLowerCase();
  return NON_MUSIC_KEYWORDS.some((kw) => lower.includes(kw));
}

/** Parse ISO 8601 duration (PT1H23M45S) to seconds */
export function parseDuration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);
  return hours * 3600 + minutes * 60 + seconds;
}

/** Batch-fetch durations for video IDs via videos.list?part=contentDetails */
async function fetchDurations(
  videoIds: string[]
): Promise<Map<string, number>> {
  const durations = new Map<string, number>();
  if (videoIds.length === 0) return durations;

  // YouTube allows max 50 IDs per request
  const chunks: string[][] = [];
  for (let i = 0; i < videoIds.length; i += 50) {
    chunks.push(videoIds.slice(i, i + 50));
  }

  for (const chunk of chunks) {
    const params = new URLSearchParams({
      part: "contentDetails",
      id: chunk.join(","),
      key: API_KEY,
    });

    try {
      const res = await fetch(`${YT_API}/videos?${params}`, {
        next: { revalidate: 3600 },
      });
      if (res.ok) {
        const data = await res.json();
        for (const item of data.items || []) {
          const dur = parseDuration(item.contentDetails?.duration || "");
          durations.set(item.id, dur);
        }
      }
    } catch {
      // silently skip duration fetch failures
    }
  }

  return durations;
}

/**
 * Only use approved channels. If none approved yet, returns empty array
 * (YT feed will be empty until channels are curated via /curator).
 */
export function sampleChannels(n: number): { name: string; id: string; labels?: string[] }[] {
  const pool = approvedChannels.length > 0 ? approvedChannels : musicChannels;
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function uploadsPlaylistId(channelId: string): string {
  return "UU" + channelId.slice(2);
}

export async function getChannelUploads(
  channelId: string,
  maxResults = 5,
  withDuration = false
): Promise<YouTubeVideo[]> {
  const cacheKey = `yt-uploads-${channelId}-${withDuration ? "dur" : "nodur"}`;
  const cached = cacheGet<YouTubeVideo[]>(cacheKey);
  if (cached) return cached;

  const playlistId = uploadsPlaylistId(channelId);
  const params = new URLSearchParams({
    part: "snippet",
    playlistId,
    maxResults: String(maxResults),
    key: API_KEY,
  });

  const res = await fetch(`${YT_API}/playlistItems?${params}`, {
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    console.error(`YouTube uploads error for ${channelId}:`, res.status);
    return [];
  }

  const data = await res.json();
  const videos: YouTubeVideo[] = (data.items || [])
    .filter((item: { snippet?: { resourceId?: { videoId?: string } } }) =>
      item.snippet?.resourceId?.videoId
    )
    .map(
      (item: {
        snippet: {
          resourceId: { videoId: string };
          title: string;
          channelTitle: string;
          thumbnails?: {
            high?: { url: string; width?: number; height?: number };
            medium?: { url: string; width?: number; height?: number };
            default?: { url: string; width?: number; height?: number };
          };
        };
      }) => {
        const thumb =
          item.snippet.thumbnails?.high ||
          item.snippet.thumbnails?.medium ||
          item.snippet.thumbnails?.default;
        return {
          id: item.snippet.resourceId.videoId,
          title: item.snippet.title,
          channelTitle: item.snippet.channelTitle,
          thumbnail: thumb?.url || "",
          width: thumb?.width || 480,
          height: thumb?.height || 360,
          duration: null,
        };
      }
    );

  // Optionally fetch durations
  if (withDuration && videos.length > 0) {
    const durations = await fetchDurations(videos.map((v) => v.id));
    for (const v of videos) {
      v.duration = durations.get(v.id) ?? null;
    }
  }

  cacheSet(cacheKey, videos);
  return videos;
}

export function parseVideoTitle(
  title: string,
  channelName: string
): { name: string; artist: string } {
  const cleaned = title
    .replace(/\s*[\[\(](?:official|music|lyric|audio|video|hd|hq|4k|visualizer|remastered|remaster|full|original)[\s\w]*[\]\)]/gi, "")
    .replace(/\s*\|\s*.*$/, "")
    .trim();

  const separators = [" — ", " – ", " - "];
  for (const sep of separators) {
    const idx = cleaned.indexOf(sep);
    if (idx > 0) {
      return {
        artist: cleaned.slice(0, idx).trim(),
        name: cleaned.slice(idx + sep.length).trim() || cleaned,
      };
    }
  }

  return { name: cleaned || title, artist: channelName };
}

function videoThumbnail(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/sddefault.jpg`;
}

function videoToCard(v: YouTubeVideo): CardData {
  const { name, artist } = parseVideoTitle(v.title, v.channelTitle);
  return {
    id: `yt-${v.id}`,
    name,
    artist,
    album: v.channelTitle,
    image: videoThumbnail(v.id),
    imageSmall: v.thumbnail,
    previewUrl: null,
    spotifyUrl: null,
    youtubeUrl: `https://www.youtube.com/watch?v=${v.id}`,
    videoId: v.id,
    uri: null,
    source: "youtube" as const,
    bpm: null,
    energy: null,
    danceability: null,
    valence: null,
    key: null,
    duration: v.duration,
  };
}

export async function discoverFromYouTube(limit = 30): Promise<CardData[]> {
  // If no approved channels yet, return empty — feed stays Spotify-only
  if (approvedChannels.length === 0) {
    return [];
  }

  const cacheKey = "yt-discover-pool";
  let pool = cacheGet<CardData[]>(cacheKey);

  if (!pool || pool.length < limit) {
    const channels = sampleChannels(10);
    const allVideos: YouTubeVideo[] = [];

    const results = await Promise.allSettled(
      channels.map((ch) => getChannelUploads(ch.id, 3))
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        allVideos.push(...result.value);
      }
    }

    pool = allVideos
      .filter((v) => {
        if (v.title === "Private video" || v.title === "Deleted video") return false;
        const lower = v.title.toLowerCase();
        if (lower.includes("#shorts") || lower.includes("#short")) return false;
        if (lower.includes("shorts") && lower.length < 80) return false;
        if (v.height > v.width) return false;
        if (isNonMusic(v.title)) return false;
        return true;
      })
      .map(videoToCard);

    cacheSet(cacheKey, pool);
  }

  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, limit);
}

/** Discover long-form mixes (DJ sets, live recordings, podcasts >50min) */
export async function discoverMixes(limit = 20): Promise<CardData[]> {
  if (approvedChannels.length === 0) return [];

  const cacheKey = "yt-mixes-pool";
  let pool = cacheGet<CardData[]>(cacheKey);

  if (!pool || pool.length < limit) {
    // Prefer channels with DJ/mix labels, but include all
    const allApproved = [...approvedChannels] as { name: string; id: string; labels?: string[] }[];
    const mixChannels = allApproved.filter(
      (c) => c.labels?.some((l) => /dj|set|live|mix/i.test(l))
    );
    const otherChannels = allApproved.filter(
      (c) => !c.labels?.some((l) => /dj|set|live|mix/i.test(l))
    );

    // Take more from mix-labeled channels
    const shuffledMix = [...mixChannels].sort(() => Math.random() - 0.5).slice(0, 8);
    const shuffledOther = [...otherChannels].sort(() => Math.random() - 0.5).slice(0, 4);
    const channels = [...shuffledMix, ...shuffledOther];

    const allVideos: YouTubeVideo[] = [];
    const results = await Promise.allSettled(
      channels.map((ch) => getChannelUploads(ch.id, 10, true))
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        allVideos.push(...result.value);
      }
    }

    // Filter for long-form content (>50 minutes = 3000 seconds)
    pool = allVideos
      .filter((v) => {
        if (v.title === "Private video" || v.title === "Deleted video") return false;
        if (!v.duration || v.duration < 3000) return false;
        const lower = v.title.toLowerCase();
        if (lower.includes("#shorts") || lower.includes("#short")) return false;
        return true;
      })
      .map(videoToCard);

    cacheSet(cacheKey, pool);
  }

  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, limit);
}

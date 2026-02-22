const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID!;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET!;

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
  });

  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return cachedToken.token;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  album: {
    name: string;
    images: { url: string; width: number; height: number }[];
  };
  preview_url: string | null;
  external_urls: { spotify: string };
  uri: string;
  popularity: number;
}

export interface AudioFeatures {
  tempo: number;
  energy: number;
  danceability: number;
  valence: number;
  key: number;
}

const KEY_NAMES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];

export function keyName(key: number): string {
  return key >= 0 && key < 12 ? KEY_NAMES[key] : "?";
}

const GENRE_SEARCH_QUERIES: Record<string, string> = {
  "electronic,house,techno": "house techno electronic",
  "house,deep-house": "deep house",
  "techno,minimal-techno": "techno minimal",
  "electro,detroit-techno": "electro detroit techno",
  "breakbeat,drum-and-bass": "breakbeat drum and bass",
  "ambient,idm": "ambient idm",
  "dub,dub-techno": "dub techno",
  "disco,funk": "disco funk",
};

function genresToSearchQuery(genres: string[]): string {
  const key = genres.join(",");
  return GENRE_SEARCH_QUERIES[key] || genres.map((g) => g.replace(/-/g, " ")).join(" ");
}

export async function searchTracks(
  genres: string[],
  limit = 30,
  offset = 0
): Promise<SpotifyTrack[]> {
  const token = await getAccessToken();
  const q = genresToSearchQuery(genres);
  const params = new URLSearchParams({
    q,
    type: "track",
    limit: String(Math.min(limit, 50)),
    offset: String(offset),
  });

  const res = await fetch(
    `https://api.spotify.com/v1/search?${params}`,
    { headers: { Authorization: `Bearer ${token}` }, next: { revalidate: 300 } }
  );

  if (!res.ok) {
    console.error("Spotify search error:", res.status, await res.text());
    return [];
  }

  const data = await res.json();
  return data.tracks?.items || [];
}

export async function getAudioFeatures(
  trackIds: string[]
): Promise<Record<string, AudioFeatures>> {
  if (trackIds.length === 0) return {};
  const token = await getAccessToken();

  const res = await fetch(
    `https://api.spotify.com/v1/audio-features?ids=${trackIds.join(",")}`,
    { headers: { Authorization: `Bearer ${token}` }, next: { revalidate: 3600 } }
  );

  if (!res.ok) return {};
  const data = await res.json();
  const map: Record<string, AudioFeatures> = {};
  for (const f of data.audio_features || []) {
    if (f) map[f.id] = f;
  }
  return map;
}

export async function getAvailableGenres(): Promise<string[]> {
  const token = await getAccessToken();
  const res = await fetch(
    "https://api.spotify.com/v1/recommendations/available-genre-seeds",
    { headers: { Authorization: `Bearer ${token}` }, next: { revalidate: 86400 } }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data.genres || [];
}

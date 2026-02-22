/**
 * Discogs API — free personal token, 240 req/min.
 * Best source for vinyl/electronic music genre + style metadata.
 * 
 * Get your token: https://www.discogs.com/settings/developers
 */

const DISCOGS_API = "https://api.discogs.com";
const USER_AGENT = "digeart/1.0 +https://github.com/9000fm/digeart";

interface DiscogsArtistResult {
  id: number;
  name: string;
  genres: string[];
  styles: string[];
  profile: string;
}

interface DiscogsSearchResult {
  id: number;
  title: string;
  type: string;
  genre?: string[];
  style?: string[];
}

function getToken(): string | null {
  return process.env.DISCOGS_TOKEN || null;
}

function headers(): Record<string, string> {
  const h: Record<string, string> = {
    "User-Agent": USER_AGENT,
  };
  const token = getToken();
  if (token) {
    h["Authorization"] = `Discogs token=${token}`;
  }
  return h;
}

/**
 * Search for an artist by name. Returns genres + styles from their releases.
 * Discogs genres are broad (Electronic, Rock, etc.)
 * Discogs styles are specific (Deep House, Minimal Techno, Acid, etc.)
 * Styles are what we really want.
 */
export async function searchArtistGenres(
  artistName: string
): Promise<DiscogsArtistResult | null> {
  const query = encodeURIComponent(artistName.trim());
  const url = `${DISCOGS_API}/database/search?q=${query}&type=artist&per_page=1`;

  try {
    const res = await fetch(url, { headers: headers() });
    if (!res.ok) {
      if (res.status === 429) {
        // Rate limited — wait and return null
        console.warn("Discogs rate limited, backing off");
        return null;
      }
      return null;
    }

    const data = await res.json();
    const artist = data.results?.[0];
    if (!artist) return null;

    // Get artist releases to collect genres/styles (artist endpoint doesn't have them)
    const releasesUrl = `${DISCOGS_API}/artists/${artist.id}/releases?per_page=10&sort=year&sort_order=desc`;
    const relRes = await fetch(releasesUrl, { headers: headers() });

    if (!relRes.ok) {
      return {
        id: artist.id,
        name: artist.title,
        genres: [],
        styles: [],
        profile: "",
      };
    }

    const relData = await relRes.json();
    const genreSet = new Set<string>();
    const styleSet = new Set<string>();

    // Collect genres/styles from releases (search results include them)
    // But releases endpoint doesn't — need to search releases instead
    // Actually, search results DO include genre/style
    const searchRelUrl = `${DISCOGS_API}/database/search?artist=${query}&type=release&per_page=15`;
    const searchRelRes = await fetch(searchRelUrl, { headers: headers() });

    if (searchRelRes.ok) {
      const searchRelData = await searchRelRes.json();
      for (const rel of (searchRelData.results || []) as DiscogsSearchResult[]) {
        for (const g of rel.genre || []) genreSet.add(g);
        for (const s of rel.style || []) styleSet.add(s);
      }
    }

    return {
      id: artist.id,
      name: artist.title || artistName,
      genres: [...genreSet],
      styles: [...styleSet],
      profile: "",
    };
  } catch (e) {
    console.error(`Discogs lookup failed for "${artistName}":`, e);
    return null;
  }
}

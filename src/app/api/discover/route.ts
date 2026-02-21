import { NextRequest, NextResponse } from "next/server";
import { getRecommendations, getAudioFeatures } from "@/lib/spotify";
import { discoverFromYouTube } from "@/lib/youtube";
import type { CardData } from "@/lib/types";

export async function GET(req: NextRequest) {
  const genres = req.nextUrl.searchParams.get("genres")?.split(",") || [
    "electronic",
    "house",
    "techno",
  ];
  const limit = Math.min(
    Number(req.nextUrl.searchParams.get("limit") || 30),
    50
  );
  const source = req.nextUrl.searchParams.get("source") || "all";

  try {
    let cards: CardData[] = [];

    if (source === "spotify" || source === "all") {
      const spotifyLimit = source === "all" ? Math.ceil(limit * 0.6) : limit;
      const tracks = await getRecommendations(genres, spotifyLimit);
      const ids = tracks.map((t) => t.id);
      const features = await getAudioFeatures(ids);

      const spotifyCards: CardData[] = tracks.map((t) => ({
        id: t.id,
        name: t.name,
        artist: t.artists.map((a) => a.name).join(", "),
        album: t.album.name,
        image: t.album.images[0]?.url || "",
        imageSmall: t.album.images[t.album.images.length - 1]?.url || "",
        previewUrl: t.preview_url,
        spotifyUrl: t.external_urls.spotify,
        youtubeUrl: null,
        videoId: null,
        uri: t.uri,
        source: "spotify",
        bpm: features[t.id] ? Math.round(features[t.id].tempo) : null,
        energy: features[t.id]
          ? Math.round(features[t.id].energy * 100)
          : null,
        danceability: features[t.id]
          ? Math.round(features[t.id].danceability * 100)
          : null,
        valence: features[t.id]
          ? Math.round(features[t.id].valence * 100)
          : null,
        key: features[t.id]?.key ?? null,
        duration: null,
      }));

      cards.push(...spotifyCards);
    }

    if (source === "youtube" || source === "all") {
      const ytLimit = source === "all" ? Math.floor(limit * 0.4) : limit;
      const ytCards = await discoverFromYouTube(ytLimit);
      cards.push(...ytCards);
    }

    // Shuffle when mixing sources
    if (source === "all") {
      cards.sort(() => Math.random() - 0.5);
    }

    return NextResponse.json({ cards });
  } catch (err) {
    console.error("Discover API error:", err);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

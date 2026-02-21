export interface CardData {
  id: string;
  name: string;
  artist: string;
  album: string;
  image: string;
  imageSmall: string;
  previewUrl: string | null;
  spotifyUrl: string | null;
  youtubeUrl: string | null;
  videoId: string | null;
  uri: string | null;
  source: "spotify" | "youtube";
  bpm: number | null;
  energy: number | null;
  danceability: number | null;
  valence: number | null;
  key: number | null;
  duration: number | null;
}

import { SpotifyTrack } from "./SpotifyTrack";
import { Track } from "./Track";
import { User } from "./User";

export type PlaylistTrack = {
  text: string;
  spotifyData: SpotifyTrack | {} | null;
  timestamp: number;
  dj?: User;
} & Pick<Track, "album" | "artist" | "track">;

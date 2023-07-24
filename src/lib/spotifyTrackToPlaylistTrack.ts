import { PlaylistTrack } from "../types/PlaylistTrack";
import { QueuedTrack } from "../types/QueuedTrack";
import { SpotifyTrack } from "../types/SpotifyTrack";

export default function spotifyTrackToPlaylistTrack(
  track: SpotifyTrack,
  inQueue?: QueuedTrack
): PlaylistTrack {
  return {
    text: track.name,
    spotifyData: track,
    timestamp: Date.now(),
    artist: track.artists[0].name,
    album: track.album.name,
    track: track.name,
    dj: inQueue && { userId: inQueue?.userId, username: inQueue?.username },
  };
}

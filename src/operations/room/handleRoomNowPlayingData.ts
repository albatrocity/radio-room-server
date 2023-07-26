import {
  PUBSUB_PLAYLIST_ADDED,
  PUBSUB_ROOM_NOW_PLAYING_FETCHED,
  PUBSUB_ROOM_SETTINGS_UPDATED,
  PUBSUB_SPOTIFY_AUTH_ERROR,
  PUBSUB_SPOTIFY_RATE_LIMIT_ERROR,
} from "../../lib/constants";
import { pubClient } from "../../lib/redisClients";
import spotifyTrackToPlaylistTrack from "../../lib/spotifyTrackToPlaylistTrack";
import { PlaylistTrack } from "../../types/PlaylistTrack";
import { RoomMeta } from "../../types/Room";
import { SpotifyError } from "../../types/SpotifyApi";
import { SpotifyTrack } from "../../types/SpotifyTrack";
import {
  addTrackToRoomPlaylist,
  clearRoomCurrent,
  getQueue,
  getRoomCurrent,
  removeFromQueue,
  setRoomCurrent,
} from "../data";

export default async function handleRoomNowPlayingData(
  roomId: string,
  nowPlaying?: SpotifyTrack
) {
  // Check currently playing track in the room
  const current = await getRoomCurrent(roomId);

  // If there is no currently playing track, clear the current hash and publish
  if (!nowPlaying) {
    const clearedCurrent = await clearRoomCurrent(roomId);
    await pubSubNowPlaying(roomId, nowPlaying, clearedCurrent ?? {});
    return null;
  }

  await setRoomCurrent(roomId, {
    ...nowPlaying,
    lastUpdatedAt: Date.now().toString(),
  });
  const updatedCurrent = await getRoomCurrent(roomId);

  // If the currently playing track is the same as the one we just fetched, return early
  if (current?.release?.uri === nowPlaying?.uri) {
    return null;
  }

  await pubSubNowPlaying(roomId, nowPlaying, updatedCurrent);

  // Add the track to the room playlist
  const queue = await getQueue(roomId);
  const inQueue = (queue ?? []).find((track) => track.uri === nowPlaying.uri);

  const playlistTrack = spotifyTrackToPlaylistTrack(nowPlaying, inQueue);

  await addTrackToRoomPlaylist(roomId, playlistTrack);
  await pubPlaylistTrackAdded(roomId, playlistTrack);
  if (inQueue) {
    await removeFromQueue(roomId, inQueue.uri);
  }
}

async function pubSubNowPlaying(
  roomId: string,
  nowPlaying: SpotifyTrack | undefined,
  meta: RoomMeta
) {
  pubClient.publish(
    PUBSUB_ROOM_NOW_PLAYING_FETCHED,
    JSON.stringify({ roomId, nowPlaying, meta })
  );
}

async function pubPlaylistTrackAdded(roomId: string, track: PlaylistTrack) {
  pubClient.publish(PUBSUB_PLAYLIST_ADDED, JSON.stringify({ roomId, track }));
}

export async function pubSpotifyError(
  { userId, roomId }: { userId: string; roomId: string },
  error: SpotifyError
) {
  pubClient.publish(
    PUBSUB_SPOTIFY_AUTH_ERROR,
    JSON.stringify({ userId, roomId, error })
  );
}

export async function pubRateLimitError(
  { userId, roomId }: { userId: string; roomId: string },
  error: SpotifyError
) {
  pubClient.publish(
    PUBSUB_SPOTIFY_RATE_LIMIT_ERROR,
    JSON.stringify({ userId, roomId, error })
  );
}

export async function pubRoomSettingsUpdated(roomId: string) {
  pubClient.publish(PUBSUB_ROOM_SETTINGS_UPDATED, roomId);
}

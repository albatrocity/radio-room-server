import { getSpotifyApiForUser } from "../../operations/spotify/getSpotifyApi";
import { SpotifyTrack } from "../../types/SpotifyTrack";
import {
  PUBSUB_JUKEBOX_NOW_PLAYING_FETCHED,
  PUBSUB_PLAYLIST_ADDED,
  PUBSUB_PLAYLIST_UPDATED,
  PUBSUB_SPOTIFY_AUTH_ERROR,
  PUBSUB_SPOTIFY_RATE_LIMIT_ERROR,
} from "../../lib/constants";
import {
  addTrackToRoomPlaylist,
  getQueue,
  getRoomCurrent,
  removeFromQueue,
  setRoomCurrent,
} from "../../operations/data";
import { pubClient } from "../../lib/redisClients";
import { PlaylistTrack } from "../../types/PlaylistTrack";
import { SpotifyError } from "../../types/SpotifyApi";
import { RoomMeta } from "../../types/Room";

export async function communicateNowPlaying(roomId: string) {
  const room = await pubClient.hGetAll(`room:${roomId}:details`);
  try {
    if (room.fetchMeta === "false" || room.spotifyError) {
      return;
    }
    if (room.creator) {
      const nowPlaying = (await fetchNowPlaying(room.creator)) as SpotifyTrack;
      // Check currently playing track in the room
      const current = await getRoomCurrent(roomId);
      await setRoomCurrent(roomId, {
        ...nowPlaying,
        lastUpdatedAt: Date.now().toString(),
      });
      const updatedCurrent = await getRoomCurrent(roomId);

      // If there is no currently playing track, or the currently playing track is different from the one we just fetched, publish the new track data
      if (!nowPlaying?.uri) {
        await pubSubNowPlaying(roomId, nowPlaying, updatedCurrent);
        return;
      }
      if (current?.release?.uri === nowPlaying?.uri) {
        return null;
      }

      await pubSubNowPlaying(roomId, nowPlaying, updatedCurrent);

      // Add the track to the room playlist
      const queue = await getQueue(roomId);
      const inQueue = (queue ?? []).find(
        (track) => track.uri === nowPlaying.uri
      );

      const playlistTrack: PlaylistTrack = {
        text: nowPlaying.name,
        spotifyData: nowPlaying,
        timestamp: Date.now(),
        artist: nowPlaying.artists[0].name,
        album: nowPlaying.album.name,
        track: nowPlaying.name,
        dj: inQueue && { userId: inQueue?.userId, username: inQueue?.username },
      };

      await addTrackToRoomPlaylist(roomId, playlistTrack);
      await pubPlaylistTrackAdded(roomId, playlistTrack);
      if (inQueue) {
        await removeFromQueue(roomId, inQueue.uri);
      }
    }
    return;
  } catch (e: any) {
    console.error(e);
    if (e.body?.error?.status === 401) {
      pubSpotifyError({ userId: room.creator, roomId }, e.body.error);
    }
    // Rate limited
    if (e.body?.error?.status === 429) {
      // let worker know we've been limited
      pubRateLimitError({ userId: room.creator, roomId }, e.body.error);
    }
    return;
  }
}

async function fetchNowPlaying(userId: string) {
  const api = await getSpotifyApiForUser(userId);
  const nowPlaying = await api.getMyCurrentPlayingTrack();
  return nowPlaying.body.item;
}

async function pubSubNowPlaying(
  roomId: string,
  nowPlaying: SpotifyTrack,
  meta: RoomMeta
) {
  pubClient.publish(
    PUBSUB_JUKEBOX_NOW_PLAYING_FETCHED,
    JSON.stringify({ roomId, nowPlaying, meta })
  );
}

async function pubPlaylist(roomId: string, playlist: PlaylistTrack[]) {
  pubClient.publish(
    PUBSUB_PLAYLIST_UPDATED,
    JSON.stringify({ roomId, playlist })
  );
}

async function pubPlaylistTrackAdded(roomId: string, track: PlaylistTrack) {
  pubClient.publish(PUBSUB_PLAYLIST_ADDED, JSON.stringify({ roomId, track }));
}

async function pubSpotifyError(
  { userId, roomId }: { userId: string; roomId: string },
  error: SpotifyError
) {
  pubClient.publish(
    PUBSUB_SPOTIFY_AUTH_ERROR,
    JSON.stringify({ userId, roomId, error })
  );
}

async function pubRateLimitError(
  { userId, roomId }: { userId: string; roomId: string },
  error: SpotifyError
) {
  pubClient.publish(
    PUBSUB_SPOTIFY_RATE_LIMIT_ERROR,
    JSON.stringify({ userId, roomId, error })
  );
}

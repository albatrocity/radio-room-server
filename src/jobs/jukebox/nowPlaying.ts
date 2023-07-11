import { client } from "./redis";
import getSpotifyApiForUser from "../../operations/spotify/getSpotifyApi";
import { SpotifyTrack } from "../../types/SpotifyTrack";
import { PUBSUB_JUKEBOX_NOW_PLAYING_FETCHED } from "../../lib/constants";
import { getRoomCurrent, setRoomCurrent } from "../../operations/data";
import { pubClient } from "../../lib/redisClients";

export async function communicateNowPlaying(roomId: string) {
  const room = await pubClient.hGetAll(`room:${roomId}:details`);
  try {
    if (room.creator) {
      const nowPlaying = (await fetchNowPlaying(room.creator)) as SpotifyTrack;
      console.log("get current ");
      // Check currently playing track in the room
      const current = await getRoomCurrent(roomId);
      console.log("current", current);

      // If there is no currently playing track, or the currently playing track is different from the one we just fetched, publish the new track data
      if (!nowPlaying || !nowPlaying.uri) {
        return null;
      }
      if (current?.uri === nowPlaying?.uri) {
        return null;
      }

      pubSubNowPlaying(roomId, nowPlaying);
      await setRoomCurrent(roomId, nowPlaying);
    }
    return null;
  } catch (e) {
    console.error(e);
    return null;
  }
}

async function fetchNowPlaying(userId: string) {
  const api = await getSpotifyApiForUser(userId);
  try {
    const nowPlaying = await api.getMyCurrentPlayingTrack();
    return nowPlaying.body.item;
  } catch (e) {
    console.error(e);
  }
}

async function pubSubNowPlaying(roomId: string, nowPlaying: SpotifyTrack) {
  client.publish(
    PUBSUB_JUKEBOX_NOW_PLAYING_FETCHED,
    JSON.stringify({ roomId, nowPlaying })
  );
}

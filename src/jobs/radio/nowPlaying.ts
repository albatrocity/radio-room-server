import { getSpotifyApiForUser } from "../../operations/spotify/getSpotifyApi";
import { SpotifyTrack } from "../../types/SpotifyTrack";
import {
  ERROR_STATION_FETCH_FAILED,
  PUBSUB_RADIO_ERROR,
} from "../../lib/constants";

import { pubClient } from "../../lib/redisClients";
import getStation from "../../operations/getStation";
import handleRoomNowPlayingData, {
  pubRateLimitError,
  pubRoomSettingsUpdated,
  pubSpotifyError,
} from "../../operations/room/handleRoomNowPlayingData";
import { findRoom, setRoomCurrent } from "../../operations/data";
import { writeJsonToHset } from "../../operations/data/utils";
import makeNowPlayingFromStationMeta from "../../lib/makeNowPlayingFromStationMeta";

export async function communicateNowPlaying(roomId: string) {
  const room = await findRoom(roomId);
  if (!room) {
    return;
  }
  try {
    if (!room || room.spotifyError || room.type !== "radio" || !room.radioUrl) {
      return;
    }
    if (room.creator) {
      // Fetch station meta
      const stationMeta = await getStation(room.radioUrl, room.radioProtocol);
      console.log("STATION META");
      console.log(stationMeta);
      const roomCurrentKey = `room:${roomId}:current`;

      if (!stationMeta?.title) {
        throw new Error(ERROR_STATION_FETCH_FAILED);
      } else {
        const roomDetailsKey = `room:${roomId}:details`;
        const hasError = await pubClient.hExists(roomDetailsKey, "radioError");
        if (hasError) {
          await pubClient.hDel(roomDetailsKey, "radioError");
          await pubRoomSettingsUpdated(roomId);
        }
      }

      const nowPlaying = room.fetchMeta
        ? await fetchNowPlaying(room.creator, stationMeta.title)
        : await makeNowPlayingFromStationMeta(stationMeta);

      console.log("radio now playing");
      console.log(nowPlaying);

      await writeJsonToHset(roomCurrentKey, {
        stationMeta: JSON.stringify(stationMeta),
      });

      await handleRoomNowPlayingData(roomId, nowPlaying, stationMeta);
    }
    return;
  } catch (e: any) {
    console.error(e);
    if (
      e.message === ERROR_STATION_FETCH_FAILED ||
      e.code === "ERR_INVALID_ARG_TYPE"
    ) {
      pubRadioError(
        { userId: room.creator, roomId },
        {
          message:
            "Fetching the radio station failed. Metadata cannot be collected and audio streaming will not work until this is resolved by the host.",
          name: "RadioError",
        }
      );
    }
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

async function fetchNowPlaying(userId: string, query: string) {
  const api = await getSpotifyApiForUser(userId);
  const searchResults = await api.searchTracks(query);
  return searchResults?.body?.tracks?.items[0];
}

async function pubRadioError(
  { userId, roomId }: { userId: string; roomId: string },
  error: Error
) {
  pubClient.publish(
    PUBSUB_RADIO_ERROR,
    JSON.stringify({ userId, roomId, error })
  );
}

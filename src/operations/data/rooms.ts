import { isEmpty, isNil } from "remeda";

import { pubClient } from "../../lib/redisClients";
import { Room, RoomMeta, StoredRoom } from "../../types/Room";
import { SEVEN_DAYS } from "../../lib/constants";
import { writeJsonToHset } from "./utils";
import { SpotifyTrack } from "../../types/SpotifyTrack";
import { getQueue } from "./djs";

export async function persistRoom(room: Room) {
  try {
    await pubClient.sAdd("rooms", room.id);
    await pubClient.sAdd(`user:${room.creator}:rooms`, room.id);
    return writeJsonToHset(`room:${room.id}:details`, room, {
      PX: SEVEN_DAYS,
    });
  } catch (e) {
    console.log("ERROR FROM data/rooms/persistRoom", room);
    console.error(e);
  }
}

export async function findRoom(roomId: string) {
  const roomKey = `room:${roomId}:details`;
  try {
    const results = await pubClient.hGetAll(roomKey);

    if (isEmpty(results)) {
      return null;
    } else {
      const parsed = parseRoom(results as unknown as StoredRoom);
      return parsed;
    }
  } catch (e) {
    console.log("ERROR FROM data/rooms/findRoom", roomId);
    console.error(e);
  }
}

export async function setRoomFetching(roomId: string, value: boolean) {
  try {
    await pubClient.set(`room:${roomId}:fetching`, value ? "1" : "0");
  } catch (e) {
    console.log("ERROR FROM data/rooms/setRoomFetching", roomId, value);
    console.error(e);
  }
}

export async function getRoomFetching(roomId: string) {
  try {
    const result = await pubClient.get(`room:${roomId}:fetching`);
    return result === "1";
  } catch (e) {
    console.log("ERROR FROM data/rooms/getRoomFetching", roomId);
    console.error(e);
  }
}

export async function setRoomCurrent(roomId: string, meta: any) {
  const roomCurrentKey = `room:${roomId}:current`;
  const payload = await makeJukeboxCurrentPayload(roomId, meta);
  const parsedMeta = payload.data.meta;
  try {
    await pubClient.hDel(roomCurrentKey, ["dj", "release", "artwork"]);

    await writeJsonToHset(roomCurrentKey, {
      ...parsedMeta,
      lastUpdated: String(Date.now()),
      release: JSON.stringify(parsedMeta.release),
      dj: parsedMeta.dj ? JSON.stringify(parsedMeta.dj) : undefined,
    });
    await pubClient.pExpire(roomCurrentKey, SEVEN_DAYS);
  } catch (e) {
    console.error(e);
    console.error("Error from data/rooms/setRoomCurrent", roomId, meta);
  }
}

export async function getRoomCurrent(roomId: string) {
  const roomCurrentKey = `room:${roomId}:current`;
  const result = await pubClient.hGetAll(roomCurrentKey);
  return {
    ...result,
    ...(result.release
      ? {
          release: JSON.parse(result.release),
        }
      : {}),
    ...(result.dj
      ? {
          dj: result.dj && JSON.parse(result.dj),
        }
      : {}),
    ...(result.spotifyError
      ? {
          dj: result.spotifyError && JSON.parse(result.spotifyError),
        }
      : {}),
  } as RoomMeta;
}

export async function makeJukeboxCurrentPayload(
  roomId: string,
  nowPlaying: SpotifyTrack
) {
  const room = await findRoom(roomId);
  const artwork = room?.artwork ?? nowPlaying?.album?.images?.[0]?.url;
  const queue = await getQueue(roomId);
  const queuedTrack = queue.find((x) => x.uri === nowPlaying?.uri);

  return {
    type: "META",
    data: {
      meta: {
        title: nowPlaying?.name,
        bitrate: 360,
        artist: nowPlaying?.artists?.map((x) => x.name).join(", "),
        album: nowPlaying?.album?.name,
        track: nowPlaying?.name,
        release: nowPlaying,
        artwork,
        dj: queuedTrack?.userId
          ? { userId: queuedTrack.userId, username: queuedTrack.username }
          : null,
      },
    },
  };
}

export async function removeUserRoomsSpotifyError(userId: string) {
  const userCreatedRooms = await pubClient.sMembers(`user:${userId}:rooms`);

  await Promise.all(
    userCreatedRooms.map((roomId) => {
      return pubClient.hDel(`room:${roomId}:details`, "spotifyError");
    })
  );
}

function parseRoom(room: StoredRoom): Room {
  return {
    ...room,
    fetchMeta: room.fetchMeta === "true",
    enableSpotifyLogin: room.enableSpotifyLogin === "true",
    deputizeOnJoin: room.deputizeOnJoin === "true",
    passwordRequired: !isNil(room.password),
    ...(room.artwork === "undefined" ? {} : { artwork: room.artwork }),
    ...(room.spotifyError
      ? { spotifyError: JSON.parse(room.spotifyError) }
      : {}),
  };
}

export function removeSensitiveRoomAttributes(room: Room) {
  return {
    ...room,
    password: undefined,
  };
}

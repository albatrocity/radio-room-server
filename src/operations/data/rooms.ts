import { isEmpty } from "remeda";

import { pubClient } from "../../lib/redisClients";
import { Room, RoomMeta, StoredRoom } from "../../types/Room";
import { SEVEN_DAYS } from "../../lib/constants";
import { mapRoomBooleans, writeJsonToHset } from "./utils";
import { SpotifyTrack } from "../../types/SpotifyTrack";
import { getQueue } from "./djs";

export async function persistRoom(room: Room) {
  try {
    await pubClient.sAdd("rooms", room.id);
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
      return mapRoomBooleans(results as unknown as StoredRoom);
    }
  } catch (e) {
    console.log("ERROR FROM data/rooms/findRoom", roomId);
    console.error(e);
  }
}

export async function setRoomFetching(roomId: string, value: boolean) {
  try {
    return pubClient.set(`room:${roomId}:fetching`, value ? "1" : "0");
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
  await writeJsonToHset(roomCurrentKey, {
    ...parsedMeta,
    release: JSON.stringify(parsedMeta.release),
  });
  await pubClient.pExpire(roomCurrentKey, SEVEN_DAYS);
}

export async function getRoomCurrent(roomId: string) {
  const roomCurrentKey = `room:${roomId}:current`;
  const result = await pubClient.hGetAll(roomCurrentKey);
  return {
    ...result,
    ...(result.release ? { release: JSON.parse(result.release) } : {}),
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

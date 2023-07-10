import { pubClient } from "../../lib/redisClients";
import { Room, StoredRoom } from "../../types/Room";
import { SEVEN_DAYS } from "../../lib/constants";
import { mapRoomBooleans, writeJsonToHset } from "./utils";

export async function persistRoom(room: Room) {
  try {
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

    if (results) {
      return mapRoomBooleans(results as unknown as StoredRoom);
    } else {
      return null;
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

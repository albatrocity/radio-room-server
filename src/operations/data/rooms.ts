import { pubClient } from "../../lib/redisClients";
import { Room } from "../../types/Room";
import { SEVEN_DAYS } from "../../lib/constants";
import { writeJsonToHset } from "./utils";

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
      return results;
    } else {
      return null;
    }
  } catch (e) {
    console.log("ERROR FROM data/rooms/findRoom", roomId);
    console.error(e);
  }
}

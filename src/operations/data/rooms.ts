import { pubClient } from "../../lib/redisClients";
import { Room } from "../../types/Room";
import { SEVEN_DAYS } from "../../lib/constants";

export async function persistRoom(room: Room) {
  try {
    return pubClient.SET(`room:${room.id}`, JSON.stringify(room), {
      PX: SEVEN_DAYS,
    });
  } catch (e) {
    console.log("ERROR FROM data/rooms/persistRoom", room);
    console.error(e);
  }
}

export async function findRoom(roomId: string) {
  const roomKey = `room:${roomId}`;
  try {
    const results = await pubClient.get(roomKey);

    if (results) {
      return JSON.parse(results);
    } else {
      return null;
    }
  } catch (e) {
    console.log("ERROR FROM data/rooms/findRoom", roomId);
    console.error(e);
  }
}

const { createHash } = require("crypto");

import { Room } from "../types/Room";
import { pubClient } from "../lib/redisClients";
import { SEVEN_DAYS } from "../lib/constants";

export async function persistRoom(room: Room) {
  return pubClient.SET(`room:${room.id}`, JSON.stringify(room), {
    PX: SEVEN_DAYS,
  });
}

export function createRoomId({
  creator,
  type,
  createdAt,
}: Pick<Room, "creator" | "type"> & { createdAt: string }) {
  const hash = createHash("md5");
  hash.update(`${creator}${type}${createdAt}`);
  return String(hash.digest("hex"));
}

export function withDefaults(
  roomDetails: Pick<Room, "title" | "creator" | "type" | "id" | "createdAt">
): Room {
  return {
    fetchMeta: true,
    extraInfo: undefined,
    password: null,
    enableSpotifyLogin: false,
    deputizeOnJoin: false,
    artwork: undefined,
    radioUrl: undefined,
    ...roomDetails,
  };
}

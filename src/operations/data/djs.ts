import { pubClient } from "../../lib/redisClients";

export async function addDj(roomId: string, userId: string) {
  try {
    return pubClient.sAdd(`room:${roomId}:djs`, userId);
  } catch (e) {
    console.log("ERROR FROM data/djs/addDj", roomId, userId);
    console.error(e);
    return null;
  }
}
export async function removeDj(roomId: string, userId: string) {
  try {
    if (userId) {
      return pubClient.sRem(`room:${roomId}:djs`, userId);
    }
    return null;
  } catch (e) {
    console.log("ERROR FROM data/djs/removeDj", roomId, userId);
    console.error(e);
    return null;
  }
}
export async function getDjs(roomId: string) {
  try {
    return pubClient.sMembers(`room:${roomId}:djs`);
  } catch (e) {
    console.log("ERROR FROM data/djs/getDjs", roomId);
    console.error(e);
    return [];
  }
}
export async function isDj(roomId: string, userId: string) {
  try {
    return pubClient.sIsMember(`room:${roomId}:djs`, userId);
  } catch (e) {
    console.log("ERROR FROM data/djs/getDjs", roomId);
    console.error(e);
    return false;
  }
}

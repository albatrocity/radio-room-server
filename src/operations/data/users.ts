import { pubClient } from "../../lib/redisClients";
import { User } from "../../types/User";
import { writeJsonToHset } from "./utils";

export async function addOnlineUser(roomId: string, userId: string) {
  try {
    return pubClient.sAdd(`room:${roomId}:online_users`, userId);
  } catch (e) {
    console.log("ERROR FROM data/users/addOnlineUser", roomId, userId);
    console.error(e);
    return null;
  }
}
export async function removeOnlineUser(roomId: string, userId: string) {
  try {
    if (userId) {
      return pubClient.sRem(`room:${roomId}:online_users`, userId);
    }
    return null;
  } catch (e) {
    console.log("ERROR FROM data/users/removeOnlineUser", roomId, userId);
    console.error(e);
    return null;
  }
}

export async function incrementRoomUsers(roomId: string) {
  try {
    return pubClient.incr(`room:${roomId}:users`);
  } catch (e) {
    console.log("ERROR FROM data/users/incrementRoomUsers", roomId);
    console.error(e);
    return null;
  }
}
export async function decrementRoomUsers(roomId: string) {
  try {
    return pubClient.decr(`room:${roomId}:users`);
  } catch (e) {
    console.log("ERROR FROM data/users/decrementRoomUsers", roomId);
    console.error(e);
    return null;
  }
}

export async function persistUser(userId: string, attributes: Partial<User>) {
  try {
    return writeJsonToHset(`user:${userId}`, attributes);
  } catch (e) {
    console.log("ERROR FROM data/users/persistUser", userId, attributes);
    console.error(e);
    return null;
  }
}

export async function deleteUser(userId: string) {
  try {
    return pubClient.del(`user:${userId}`);
  } catch (e) {
    console.log("ERROR FROM data/users/deleteUser", userId);
    console.error(e);
    return null;
  }
}

import { objectKeys } from "../../lib/tsExtras";
import { isNil } from "remeda";

import { pubClient } from "../../lib/redisClients";
import { Reaction } from "../../types/Reaction";
import {
  Room,
  RoomError,
  RoomMeta,
  StoredRoom,
  StoredRoomMeta,
} from "../../types/Room";
import { StoredUser, User } from "../../types/User";
import { ChatMessage } from "../../types/ChatMessage";
import { compact } from "remeda";

type HSetOptions = {
  PX?: number;
};

export async function writeJsonToHset(
  setKey: string,
  attributes: Partial<User | Room | ChatMessage | Reaction | StoredRoomMeta>,
  options: HSetOptions = {}
) {
  const writes = objectKeys(attributes).map((key) => {
    if (!isNil(attributes[key])) {
      return pubClient.hSet(setKey, key, String(attributes[key]));
    }
  });
  if (options.PX) {
    pubClient.pExpire(setKey, options.PX);
  }
  return Promise.all(writes);
}

type HSet = {
  [x: string]: string;
};

export function hSetToObject(hset: HSet) {
  objectKeys(hset).reduce((acc, key) => {
    hset[key] = JSON.parse(hset[key]);
    return acc;
  }, hset);
  return hset;
}

// Gets keys from Redis that are indexed in a set
export async function getMembersFromSet<T>(
  setKey: string,
  recordPrefix: string
) {
  const members = await pubClient.sMembers(setKey);
  const reads = members.map(async (key) => {
    const track = await pubClient.get(`${recordPrefix}:${key}`);
    if (!track) {
      return null;
    }
    return JSON.parse(track) as T;
  });
  const results = await Promise.all(reads);
  return compact(results);
}

// Deletes keys from Redis that are indexed in a set elsewhere
export async function deleteMembersFromSet(
  setKey: string,
  recordPrefix: string
) {
  const members = await pubClient.sMembers(setKey);
  const dels = members.map(async (key) => {
    return pubClient.del(`${recordPrefix}:${key}`);
  });
  await dels;
  return null;
}

export function mapUserBooleans(user: StoredUser) {
  return {
    ...user,
    isDj: user.isDj === "true",
    isDeputyDj: user.isDeputyDj === "true",
    isAdmin: user.isAdmin === "true",
  };
}

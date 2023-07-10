import { objectKeys } from "ts-extras";

import { pubClient } from "../../lib/redisClients";
import { Reaction } from "../../types/Reaction";
import { Room } from "../../types/Room";
import { StoredUser, User } from "../../types/User";
import { ChatMessage } from "../../types/ChatMessage";

type HSetOptions = {
  PX?: number;
};

export async function writeJsonToHset(
  setKey: string,
  attributes: Partial<User | Room | ChatMessage | Reaction>,
  options: HSetOptions = {}
) {
  const writes = objectKeys(attributes).map((key) => {
    return pubClient.hSet(setKey, key, String(attributes[key]));
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

export function mapUserBooleans(user: StoredUser) {
  return {
    ...user,
    isDj: user.isDj === "true",
    isDeputyDj: user.isDeputyDj === "true",
    isAdmin: user.isAdmin === "true",
  };
}

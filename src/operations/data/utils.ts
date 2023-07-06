import { objectKeys } from "ts-extras";

import { pubClient } from "../../lib/redisClients";
import { Reaction } from "../../types/Reaction";
import { Room } from "../../types/Room";
import { User } from "../../types/User";
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

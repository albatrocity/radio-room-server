import { objectKeys } from "ts-extras";

import { pubClient } from "../../lib/redisClients";
import { Reaction } from "../../types/Reaction";
import { Room } from "../../types/Room";
import { User } from "../../types/User";
import { ChatMessage } from "../../types/ChatMessage";

export async function writeJsonToHset(
  setKey: string,
  attributes: Partial<User | Room | ChatMessage | Reaction>
) {
  const writes = objectKeys(attributes).map((key) => {
    return pubClient.hSet(setKey, key, String(attributes[key]));
  });
  return Promise.all(writes);
}

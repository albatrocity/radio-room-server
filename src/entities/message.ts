import { Schema, Repository } from "redis-om";

import { pubClient } from "../lib/redisClients";
import { ChatMessage } from "../types/ChatMessage";

// defines RedisOm schema for the message model
export const messageSchema = new Schema("message", {
  id: {
    type: "string",
  },
  userId: {
    type: "string",
    path: "$.user.userId",
  },
  username: {
    type: "string",
    path: "$.user.username",
  },
  content: {
    type: "text",
  },
  timestamp: {
    type: "string",
  },
  date: {
    type: "date",
    sortable: true,
  },
  mentions: {
    type: "string[]",
  },
});

export const messageRepository = new Repository(messageSchema, pubClient);

export function messageToOm(message: ChatMessage) {
  return {
    ...message,
    user: {
      id: message.user.id,
      userId: message.user.userId,
      username: message.user.username,
    },
    date: Math.floor(new Date(message.timestamp).getTime() / 1000),
  };
}
export async function getAllMessages() {
  const messages = await messageRepository
    .search()
    .sortAscending("date")
    .return.all();
  console.log(messages);
  return messages;
}

export async function deleteAllMessages() {
  await (async () => {
    for await (const key of pubClient.scanIterator({
      MATCH: "message:*",
    })) {
      await pubClient.del(key);
    }
  })();
}

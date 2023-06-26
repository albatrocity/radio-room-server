import { Schema, Repository } from "redis-om";

import { pubClient } from "../lib/redisClients";
import { ChatMessage } from "../types/ChatMessage";

// defines RedisOm schema for the message model
export const messageSchema = new Schema(
  "message",
  {
    id: {
      type: "string",
    },
    userId: {
      type: "string",
    },
    content: {
      type: "string",
    },
    timestamp: {
      type: "date",
    },
    mentions: {
      type: "string[]",
    },
  },
  {
    dataStructure: "HASH",
  }
);

export const messageRepository = new Repository(messageSchema, pubClient);

export function messageToOm(message: ChatMessage) {
  return {
    id: message.timestamp,
    userId: message.user.userId,
    username: message.user.username,
    content: message.content,
    timestamp: Math.floor(new Date(message.timestamp).getTime() / 1000),
    mentions: message.mentions,
  };
}

type StoredMessage = {
  [key: string]: string;
};

function toMessageModel(message: StoredMessage): ChatMessage {
  return {
    content: message.content,
    timestamp: new Date(Number(message.timestamp) * 1000).toISOString(),
    user: {
      userId: message.userId,
      username: message.username,
    },
    // mentions: message.mentions,
  };
}

export async function getAllMessages() {
  const messages: StoredMessage[] = [];
  await (async () => {
    for await (const key of pubClient.scanIterator({
      MATCH: "message:*",
    })) {
      const v = await pubClient.hGetAll(key);
      messages.push(v);
    }
  })();
  return messages.map(toMessageModel);
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

import { pubClient } from "../../lib/redisClients";
import { ChatMessage } from "../../types/ChatMessage";

export async function addTypingUser(roomId: string, userId: string) {
  return pubClient.sAdd(`room:${roomId}:typing_users`, userId);
}
export async function removeTypingUser(roomId: string, userId: string) {
  return pubClient.sRem(`room:${roomId}:typing_users`, userId);
}

export async function persistMessage(roomId: string, message: ChatMessage) {
  try {
    const messageString = JSON.stringify(message);
    const key = `room:${roomId}:messages`;
    const score = new Date(message.timestamp).getTime();
    return pubClient.zAdd(key, [{ score, value: messageString }]);
  } catch (e) {
    console.log("ERROR FROM data/messages/persistMessage", roomId, message);
    console.error(e);
  }
}

export async function getMessages(
  roomId: string,
  offset: number = 0,
  size: number = 50
) {
  /**
   * Logic:
   * 1. Check if room with id exists
   * 2. Fetch messages from last hour
   **/
  try {
    const roomKey = `room:${roomId}`;
    const roomExists = await pubClient.exists(roomKey);
    if (!roomExists) {
      return [];
    } else {
      const results = await pubClient.zRange(roomKey, offset, offset + size);
      return results;
    }
  } catch (e) {
    console.log("ERROR FROM data/messages/getMessages", roomId, offset, size);
    console.error(e);
  }
}

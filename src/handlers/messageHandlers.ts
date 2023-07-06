import { compact, uniq, reject } from "remeda";
import { getters, setters } from "../lib/dataStore";
import parseMessage from "../lib/parseMessage";
import sendMessage from "../lib/sendMessage";
import { processTriggerAction } from "../operations/processTriggerAction";

import { HandlerConnections } from "../types/HandlerConnections";
import { User } from "../types/User";
import { ChatMessage } from "../types/ChatMessage";
import getRoomPath from "../lib/getRoomPath";
import { addTypingUser, removeTypingUser } from "../operations/data";

export async function newMessage(
  { socket, io }: HandlerConnections,
  message: string
) {
  const users = getters.getUsers();
  const typing = getters.getTyping();
  const { content, mentions } = parseMessage(message);
  const fallbackUser: User = {
    username: socket.data.username,
    userId: socket.data.userId,
  };
  const payload = {
    user:
      users.find(({ userId }) => userId === socket.data.userId) || fallbackUser,
    content,
    mentions,
    timestamp: new Date().toISOString(),
  };
  const newTyping = compact(
    uniq(reject(typing, (u) => u.userId === socket.data.userId))
  );
  setters.setTyping(newTyping);
  await removeTypingUser(socket.data.roomId, socket.data.userId);
  io.to(getRoomPath(socket.data.roomId)).emit("event", {
    type: "TYPING",
    data: { typing: newTyping },
  });
  await sendMessage(io, payload, socket.data.roomId);
  processTriggerAction<ChatMessage>(
    {
      type: "message",
      data: payload,
    },
    io
  );
}

export function clearMessages({ socket, io }: HandlerConnections) {
  setters.setMessages([]);
  setters.setTriggerEventHistory(
    getters.getTriggerEventHistory().filter((x) => x.target?.type !== "message")
  );
  io.to(getRoomPath(socket.data.roomId)).emit("event", {
    type: "SET_MESSAGES",
    data: { messages: [] },
  });
}

export async function startTyping({ socket, io }: HandlerConnections) {
  const newTyping = compact(
    uniq([
      ...getters.getTyping(),
      getters.getUsers().find((u) => u.userId === socket.data.userId),
    ])
  );
  setters.setTyping(newTyping);
  await addTypingUser(socket.data.roomId, socket.data.userId);
  socket.broadcast.to(getRoomPath(socket.data.roomId)).emit("event", {
    type: "TYPING",
    data: { typing: newTyping },
  });
}

export async function stopTyping({ socket, io }: HandlerConnections) {
  const newTyping = compact(
    uniq(
      reject(getters.getTyping(), (user) => user.userId === socket.data.userId)
    )
  );
  setters.setTyping(newTyping);
  await removeTypingUser(socket.data.roomId, socket.data.userId);
  socket.broadcast.to(getRoomPath(socket.data.roomId)).emit("event", {
    type: "TYPING",
    data: { typing: newTyping },
  });
}

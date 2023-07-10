import { getters, setters } from "../lib/dataStore";
import parseMessage from "../lib/parseMessage";
import sendMessage from "../lib/sendMessage";
import {
  clearMessages as clearMessagesData,
  getUser,
} from "../operations/data";
// import { processTriggerAction } from "../operations/processTriggerAction";

import { HandlerConnections } from "../types/HandlerConnections";
import { User } from "../types/User";
import getRoomPath from "../lib/getRoomPath";
import {
  addTypingUser,
  getTypingUsers,
  removeTypingUser,
} from "../operations/data";

export async function newMessage(
  { socket, io }: HandlerConnections,
  message: string
) {
  const user = await getUser(socket.data.userId);
  const { content, mentions } = parseMessage(message);
  const fallbackUser: User = {
    username: socket.data.username,
    userId: socket.data.userId,
  };
  const payload = {
    user: user ?? fallbackUser,
    content,
    mentions,
    timestamp: new Date().toISOString(),
  };

  await removeTypingUser(socket.data.roomId, socket.data.userId);
  const typing = await getTypingUsers(socket.data.roomId);

  io.to(getRoomPath(socket.data.roomId)).emit("event", {
    type: "TYPING",
    data: { typing },
  });
  await sendMessage(io, payload, socket.data.roomId);
  // processTriggerAction<ChatMessage>(
  //   {
  //     type: "message",
  //     data: payload,
  //   },
  //   io
  // );
}

export async function clearMessages({ socket, io }: HandlerConnections) {
  const roomId = socket?.data?.roomId;
  await clearMessagesData(roomId);
  setters.setTriggerEventHistory(
    getters.getTriggerEventHistory().filter((x) => x.target?.type !== "message")
  );
  io.to(getRoomPath(roomId)).emit("event", {
    type: "SET_MESSAGES",
    data: { messages: [] },
  });
}

export async function startTyping({ socket }: HandlerConnections) {
  await addTypingUser(socket.data.roomId, socket.data.userId);
  const typing = await getTypingUsers(socket.data.roomId);
  socket.broadcast.to(getRoomPath(socket.data.roomId)).emit("event", {
    type: "TYPING",
    data: { typing },
  });
}

export async function stopTyping({ socket }: HandlerConnections) {
  await removeTypingUser(socket.data.roomId, socket.data.userId);
  const typing = await getTypingUsers(socket.data.roomId);
  socket.broadcast.to(getRoomPath(socket.data.roomId)).emit("event", {
    type: "TYPING",
    data: { typing },
  });
}

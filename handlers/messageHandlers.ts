import { compact, concat, find, reject, uniq } from "lodash/fp";
import { getters, setters } from "../lib/dataStore";
import parseMessage from "../lib/parseMessage";
import sendMessage from "../lib/sendMessage";
import { processTriggerAction } from "../operations/processTriggerAction";

import { HandlerConnections } from "../types/HandlerConnections";
import { User } from "../types/User";
import { ChatMessage } from "../types/ChatMessage";

export function newMessage(
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
    uniq(reject({ userId: socket.data.userId }, typing))
  );
  setters.setTyping(newTyping);
  io.emit("event", { type: "TYPING", data: { typing: newTyping } });
  sendMessage(io, payload);
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
  io.emit("event", { type: "SET_MESSAGES", data: { messages: [] } });
}

export function startTyping({ socket, io }: HandlerConnections) {
  const newTyping = compact(
    uniq(
      concat(
        getters.getTyping(),
        find({ userId: socket.data.userId }, getters.getUsers())
      )
    )
  );
  setters.setTyping(newTyping);
  socket.broadcast.emit("event", {
    type: "TYPING",
    data: { typing: newTyping },
  });
}

export function stopTyping({ socket, io }: HandlerConnections) {
  const newTyping = compact(
    uniq(reject({ userId: socket.data.userId }, getters.getTyping()))
  );
  setters.setTyping(newTyping);
  socket.broadcast.emit("event", {
    type: "TYPING",
    data: { typing: newTyping },
  });
}

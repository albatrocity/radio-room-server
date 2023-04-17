import { compact, concat, find, reject, uniq } from "lodash/fp";
import { getters, setters } from "../lib/dataStore";
import parseMessage from "../lib/parseMessage";
import sendMessage from "../lib/sendMessage";

import { HandlerConnections } from "../types/HandlerConnections";
import { User } from "../types/User";

const { getUsers, getMessages, getTyping } = getters;
const { setUsers, setMessages, setTyping } = setters;

export function newMessage(
  { socket, io }: HandlerConnections,
  message: string
) {
  const users = getUsers();
  const typing = getTyping();
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
  setTyping(newTyping);
  io.emit("event", { type: "TYPING", data: { typing: newTyping } });
  sendMessage(io, payload);
}

export function clearMessages({ socket, io }: HandlerConnections) {
  setMessages([]);
  io.emit("event", { type: "SET_MESSAGES", data: { messages: [] } });
}

export function startTyping({ socket, io }: HandlerConnections) {
  const newTyping = compact(
    uniq(concat(getTyping(), find({ userId: socket.data.userId }, getUsers())))
  );
  setTyping(newTyping);
  socket.broadcast.emit("event", {
    type: "TYPING",
    data: { typing: newTyping },
  });
}

export function stopTyping({ socket, io }: HandlerConnections) {
  const newTyping = compact(
    uniq(reject({ userId: socket.data.userId }, getTyping()))
  );
  setTyping(newTyping);
  socket.broadcast.emit("event", {
    type: "TYPING",
    data: { typing: newTyping },
  });
}

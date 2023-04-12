import { RadioSocket } from "types/RadioSocket";
import parseMessage from "../lib/parseMessage";
import sendMessage from "../lib/sendMessage";
import { Server } from "socket.io";
import { Getters, Setters } from "types/DataStores";

const { reject, find, concat, uniq, compact } = require("lodash/fp");

function authHandlers(
  socket: RadioSocket,
  io: Server,
  { getUsers, getMessages, getTyping }: Getters,
  { setUsers, setMessages, setTyping }: Setters
) {
  socket.on("new message", (data) => {
    // we tell the client to execute 'new message'
    const users = getUsers();
    const typing = getTyping();
    const { content, mentions } = parseMessage(data);
    const payload = {
      user: find({ id: socket.id }, users) || { username: socket.username },
      content,
      mentions,
      timestamp: new Date().toISOString(),
    };
    const newTyping = compact(uniq(reject({ userId: socket.userId }, typing)));
    setTyping(newTyping);
    io.emit("event", { type: "TYPING", data: { typing: newTyping } });
    sendMessage(io, payload, { getMessages, setMessages });
  });

  socket.on("clear messages", () => {
    console.log("CLEAR MESSAGES");
    setMessages([]);
    io.emit("event", { type: "SET_MESSAGES", data: { messages: [] } });
  });

  socket.on("typing", () => {
    const newTyping = compact(
      uniq(concat(getTyping(), find({ userId: socket.userId }, getUsers())))
    );
    setTyping(newTyping);
    socket.broadcast.emit("event", {
      type: "TYPING",
      data: { typing: newTyping },
    });
  });

  socket.on("stop typing", () => {
    const newTyping = compact(
      uniq(reject({ userId: socket.userId }, getTyping()))
    );
    setTyping(newTyping);
    socket.broadcast.emit("event", {
      type: "TYPING",
      data: { typing: newTyping },
    });
  });
}

export default authHandlers;

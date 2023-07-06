import { take } from "remeda";
import { Server } from "socket.io";
import { ChatMessage } from "../types/ChatMessage";
import { getters, setters } from "./dataStore";
import getRoomPath from "./getRoomPath";
import { persistMessage } from "../operations/data";

async function sendMessage(
  io: Server,
  message: ChatMessage,
  roomId: string = "/"
) {
  io.to(getRoomPath(roomId)).emit("event", {
    type: "NEW_MESSAGE",
    data: message,
  });
  const messages = getters.getMessages();
  const newMessages = [...take(messages, 120), message];
  setters.setMessages(newMessages);
  await persistMessage(roomId, message);
  return newMessages;
}

export default sendMessage;

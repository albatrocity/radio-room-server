import { take } from "remeda";
import { Server } from "socket.io";
import { ChatMessage } from "../types/ChatMessage";
import { getters, setters } from "./dataStore";

function sendMessage(io: Server, message: ChatMessage) {
  io.emit("event", { type: "NEW_MESSAGE", data: message });
  const messages = getters.getMessages();
  const newMessages = [...take(messages, 120), message];
  setters.setMessages(newMessages);
  return newMessages;
}

export default sendMessage;

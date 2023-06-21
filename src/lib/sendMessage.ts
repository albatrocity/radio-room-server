import { concat, take } from "lodash/fp";
import { Server } from "socket.io";
import { ChatMessage } from "../types/ChatMessage";
import { getters, setters } from "./dataStore";

function sendMessage(io: Server, message: ChatMessage) {
  io.emit("event", { type: "NEW_MESSAGE", data: message });
  const messages = getters.getMessages();
  const newMessages = take(120, concat(message, messages));
  setters.setMessages(newMessages);
  return newMessages;
}

export default sendMessage;

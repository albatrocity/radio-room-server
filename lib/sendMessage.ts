import { concat, take } from "lodash/fp";
import { Server } from "socket.io";
import { ChatMessage } from "types/ChatMessage";
import { getters, setters } from "./dataStore";

const { getMessages } = getters;
const { setMessages } = setters;

function sendMessage(io: Server, message: ChatMessage) {
  io.emit("event", { type: "NEW_MESSAGE", data: message });
  const messages = getMessages();
  const newMessages = take(120, concat(message, messages));
  setMessages(newMessages);
  return newMessages;
}

export default sendMessage;

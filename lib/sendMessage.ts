import { take, concat } from "lodash/fp";
import { Server } from "socket.io";
import { ChatMessage } from "types/ChatMessage";
import { Getters, Setters } from "types/DataStores";

function sendMessage(
  io: Server,
  message: ChatMessage,
  {
    getMessages,
    setMessages,
  }: {
    getMessages: Getters["getMessages"];
    setMessages: Setters["setMessages"];
  }
) {
  io.emit("event", { type: "NEW_MESSAGE", data: message });
  const messages = getMessages();
  const newMessages = take(120, concat(message, messages));
  setMessages(newMessages);
  return newMessages;
}

export default sendMessage;

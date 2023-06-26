import { Server } from "socket.io";

import { ChatMessage } from "../types/ChatMessage";
import { messageRepository, messageToOm } from "../entities";

export default async function sendMessage(io: Server, message: ChatMessage) {
  io.emit("event", { type: "NEW_MESSAGE", data: message });

  messageRepository.save(messageToOm(message));
}

import { Server } from "socket.io";
import jukeboxHandlers from "./jukebox";
import errorHandlers from "./errors";

export function bindPubSubHandlers(io: Server) {
  jukeboxHandlers(io);
  errorHandlers(io);
}

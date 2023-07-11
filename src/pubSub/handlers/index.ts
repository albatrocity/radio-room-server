import { Server } from "socket.io";
import jukeboxHandlers from "./jukebox";

export function bindPubSubHandlers(io: Server) {
  jukeboxHandlers(io);
}

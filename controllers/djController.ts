import { Server, Socket } from "socket.io";

import {
  djDeputizeUser,
  queueSong,
  searchSpotifyTrack,
  setDj,
} from "../handlers/djHandlers";
import { SpotifyEntity } from "../types/SpotifyEntity";
import { User } from "../types/User";

export default function djController(socket: Socket, io: Server) {
  socket.on("set DJ", (userId: User["userId"]) =>
    setDj({ socket, io }, userId)
  );

  socket.on("dj deputize user", (userId: User["userId"]) =>
    djDeputizeUser({ socket, io }, userId)
  );

  socket.on("queue song", (uri: SpotifyEntity["uri"]) =>
    queueSong({ socket, io }, uri)
  );

  socket.on("search spotify track", (query: string, options: any) =>
    searchSpotifyTrack({ socket, io }, { query, options })
  );
}

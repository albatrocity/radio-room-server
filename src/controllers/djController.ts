import { Server, Socket } from "socket.io";

import {
  djDeputizeUser,
  queueSong,
  searchSpotifyTrack,
  setDj,
  savePlaylist,
  handleUserJoined,
  getSavedTracks,
} from "../handlers/djHandlers";
import { events } from "../lib/eventEmitter";
import { SpotifyEntity } from "../types/SpotifyEntity";
import { User } from "../types/User";

export default function djController(socket: Socket, io: Server) {
  socket.on("set DJ", (userId: User["userId"]) =>
    setDj({ socket, io }, userId)
  );

  socket.on("dj deputize user", (userId: User["userId"]) =>
    djDeputizeUser({ io }, userId)
  );

  socket.on("queue song", (uri: SpotifyEntity["uri"]) =>
    queueSong({ socket, io }, uri)
  );

  socket.on("search spotify track", (query: { query: string; options: any }) =>
    searchSpotifyTrack({ socket, io }, query)
  );

  socket.on(
    "get spotify saved tracks",
    (query: { query: string; options: any }) => getSavedTracks({ socket, io })
  );

  socket.on(
    "save playlist",
    ({ name, uris }: { name: string; uris: SpotifyEntity["uri"][] }) =>
      savePlaylist({ socket, io }, { name, uris })
  );
}

export function lifecycleEvents(io: Server) {
  events.on("USER_JOINED", (data: { user: User; users: User[] }) => {
    handleUserJoined({ io }, { user: data.user, users: data.users });
  });
}

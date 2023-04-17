import { Server, Socket } from "socket.io";

import {
  clearPlaylist,
  getSettings,
  kickUser,
  savePlaylist,
  setCover,
  setPassword,
  settings,
} from "../handlers/adminHandlers";

import { Settings } from "../types/Settings";
import { SpotifyEntity } from "../types/SpotifyEntity";
import { User } from "../types/User";

export default function adminController(socket: Socket, io: Server) {
  socket.on("set cover", (url: string) => setCover({ socket, io }, url));
  socket.on("get settings", (url: string) => getSettings({ socket, io }));
  socket.on("set password", (value: string) =>
    setPassword({ socket, io }, value)
  );
  socket.on("kick user", (user: User) => kickUser({ socket, io }, user));
  socket.on("save playlist", (name: string, uris: SpotifyEntity["uri"][]) =>
    savePlaylist({ socket, io }, { name, uris })
  );
  socket.on("settings", (s: Settings) => settings({ socket, io }, s));
  socket.on("clear playlist", () => clearPlaylist({ socket, io }));
}

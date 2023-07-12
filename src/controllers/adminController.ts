import { Server, Socket } from "socket.io";

import {
  clearPlaylist,
  getRoomSettings,
  // getTriggerEvents,
  // setReactionTriggerEvents,
  kickUser,
  setPassword,
  setRoomSettings,
  // setMessageTriggerEvents,
} from "../handlers/adminHandlers";

import { Settings } from "../types/Settings";
import { User } from "../types/User";

export default function adminController(socket: Socket, io: Server) {
  socket.on("get room settings", (url: string) =>
    getRoomSettings({ socket, io })
  );
  socket.on("set password", (value: string) =>
    setPassword({ socket, io }, value)
  );
  socket.on("kick user", (user: User) => kickUser({ socket, io }, user));
  socket.on("set room settings", (s: Settings) =>
    setRoomSettings({ socket, io }, s)
  );
  socket.on("clear playlist", () => clearPlaylist({ socket, io }));
  // socket.on("get trigger events", () => getTriggerEvents({ socket, io }));
  // socket.on("set reaction trigger events", (data) => {
  //   setReactionTriggerEvents({ socket, io }, data);
  // });
  // socket.on("set message trigger events", (data) => {
  //   setMessageTriggerEvents({ socket, io }, data);
  // });
}

import systemMessage from "../lib/systemMessage";

import { HandlerConnections } from "../types/HandlerConnections";
import { Settings } from "../types/Settings";
import { User } from "../types/User";

import getRoomPath from "../lib/getRoomPath";
import { Room } from "../types/Room";
import { clearQueue, findRoom, getUser, persistRoom } from "../operations/data";

export async function getSettings({ io, socket }: HandlerConnections) {
  const room = await findRoom(socket.data.roomId);
  io.to(getRoomPath(socket.data.roomId)).emit("event", {
    type: "SETTINGS",
    data: room,
  });
}

export async function setPassword(
  connections: HandlerConnections,
  value: string
) {
  const room = await findRoom(connections.socket.data.roomId);
  if (room) {
    await persistRoom({ ...room, password: value });
  }
}

export async function kickUser({ io, socket }: HandlerConnections, user: User) {
  const { userId } = user;
  const storedUser = await getUser(userId);
  const socketId = storedUser?.id;

  const newMessage = systemMessage(
    `You have been kicked. I hope you deserved it.`,
    { status: "error", type: "alert", title: "Kicked" }
  );

  if (socketId) {
    io.to(socketId).emit("event", { type: "NEW_MESSAGE", data: newMessage });
    io.to(socketId).emit("event", { type: "KICKED" });

    if (io.sockets.sockets.get(socketId)) {
      io.sockets.sockets.get(socketId)?.disconnect();
    }
  }
}

export async function settings(
  { socket, io }: HandlerConnections,
  values: Settings
) {
  const roomId = socket.data.roomId;
  const prevSettings = await findRoom(roomId);
  if (!prevSettings) {
    return {};
  }
  const newSettings = {
    ...prevSettings,
    ...values,
  };

  await persistRoom(newSettings as Room);
  io.to(getRoomPath(socket.data.roomId)).emit("event", {
    type: "SETTINGS",
    data: newSettings,
  });
}

export async function clearPlaylist({ socket, io }: HandlerConnections) {
  await clearPlaylist(socket.data.roomId);
  await clearQueue(socket.data.roomId);

  io.to(getRoomPath(socket.data.roomId)).emit("event", {
    type: "PLAYLIST",
    data: [],
  });
}

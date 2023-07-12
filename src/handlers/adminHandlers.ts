import systemMessage from "../lib/systemMessage";

import { HandlerConnections } from "../types/HandlerConnections";
import { Settings } from "../types/Settings";
import { User } from "../types/User";

import getRoomPath from "../lib/getRoomPath";
import { Room } from "../types/Room";
import { clearQueue, findRoom, getUser, persistRoom } from "../operations/data";
import { Socket } from "socket.io";

function removeSensitive(room: Room) {
  return {
    ...room,
    password: undefined,
  };
}

async function getAuthedRoom(socket: Socket) {
  const room = await findRoom(socket.data.roomId);
  const isAdmin = socket.data.userId === room?.creator;
  if (!room) {
    return { room: null };
  }
  if (!isAdmin) {
    socket.emit("event", {
      type: "ERROR",
      data: {
        status: 403,
        error: "Forbidden",
        message: "You are not the room creator.",
      },
    });
    return { room: null };
  }

  return { room };
}

export async function getRoomSettings({ io, socket }: HandlerConnections) {
  const { room } = await getAuthedRoom(socket);
  if (!room) {
    return;
  }

  socket.emit("event", {
    type: "SETTINGS",
    data: room,
  });

  io.to(getRoomPath(socket.data.roomId)).emit("event", {
    type: "ROOM_SETTINGS",
    data: removeSensitive(room),
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

export async function setRoomSettings(
  { socket, io }: HandlerConnections,
  values: Settings
) {
  const { room } = await getAuthedRoom(socket);

  if (!room) {
    return;
  }
  const newSettings = {
    ...room,
    ...values,
  };

  await persistRoom(newSettings as Room);
  socket.emit("event", {
    type: "SETTINGS",
    data: newSettings,
  });

  io.to(getRoomPath(socket.data.roomId)).emit("event", {
    type: "ROOM_SETTINGS",
    data: { room: newSettings },
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

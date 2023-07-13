import { findRoom } from "../operations/data";
import { HandlerConnections } from "../types/HandlerConnections";

import { Room } from "../types/Room";

function removeSensitive(room: Room) {
  return {
    ...room,
    password: undefined,
  };
}

export async function getRoomSettings({ io, socket }: HandlerConnections) {
  if (!socket.data.roomId) {
    return null;
  }
  const room = await findRoom(socket.data.roomId);
  if (!room) {
    return;
  }

  const isAdmin = socket.data.userId === room?.creator;

  io.to(socket.id).emit("event", {
    type: "ROOM_SETTINGS",
    data: {
      room: isAdmin ? room : removeSensitive(room),
    },
  });
}

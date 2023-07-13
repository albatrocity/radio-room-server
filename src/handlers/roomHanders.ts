import { findRoom, removeSensitiveRoomAttributes } from "../operations/data";
import { HandlerConnections } from "../types/HandlerConnections";

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
      room: isAdmin ? room : removeSensitiveRoomAttributes(room),
    },
  });
}

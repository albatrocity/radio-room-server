import { Request, Response } from "express";

import { createRoomId, withDefaults } from "../operations/createRoom";
import { findRoom as findRoomData, persistRoom } from "../operations/data";
import { checkUserChallenge } from "../operations/userChallenge";
import { Server, Socket } from "socket.io";
import { getRoomSettings } from "../handlers/roomHanders";

export async function create(req: Request, res: Response) {
  const { title, type, challenge, userId } = req.body;
  const createdAt = new Date().toISOString();

  try {
    await checkUserChallenge({ challenge, userId });
    const id = createRoomId({ creator: userId, type, createdAt });
    const room = withDefaults({ title, creator: userId, type, id, createdAt });
    await persistRoom(room);
    res.send({ room });
  } catch (e) {
    res.statusCode = e === "Unauthorized" ? 401 : 400;
    res.send({ error: e, status: e === "Unauthorized" ? 401 : 400 });
  }
}

export async function findRoom(req: Request, res: Response) {
  const { id } = req.params;

  const room = await findRoomData(id);
  return res.send({ room: room });
}

export default function socketHandlers(socket: Socket, io: Server) {
  socket.on("get room settings", (url: string) =>
    getRoomSettings({ socket, io })
  );
}

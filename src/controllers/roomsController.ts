import { Request, Response } from "express";

import { createRoomId, withDefaults } from "../operations/createRoom";
import {
  findRoom as findRoomData,
  deleteRoom as deleteRoomData,
  persistRoom,
  parseRoom,
  removeSensitiveRoomAttributes,
} from "../operations/data";
import { checkUserChallenge } from "../operations/userChallenge";
import { Server, Socket } from "socket.io";
import { getRoomSettings } from "../handlers/roomHanders";
import { getHMembersFromSet } from "../operations/data/utils";
import { StoredRoom } from "../types/Room";

export async function create(req: Request, res: Response) {
  const { title, type, challenge, userId } = req.body;
  const createdAt = Date.now().toString();

  try {
    await checkUserChallenge({ challenge, userId });
    const id = createRoomId({ creator: userId, type, createdAt });
    const room = withDefaults({
      title,
      creator: userId,
      type,
      id,
      createdAt,
      lastRefreshedAt: createdAt,
    });
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
  if (room) {
    return res.send({ room: removeSensitiveRoomAttributes(room) });
  }
  return res.send({ room: null });
}

export async function findRooms(req: Request, res: Response) {
  if (req.query.creator) {
    const rooms = await getHMembersFromSet<StoredRoom>(
      `user:${req.query.creator}:rooms`,
      "room",
      "details"
    );

    return res.send({
      rooms: rooms.map(parseRoom).map(removeSensitiveRoomAttributes),
    });
  }

  res.send({ rooms: [] });
}

export async function deleteRoom(req: Request, res: Response) {
  if (req.params.id) {
    await deleteRoomData(req.params.id);
  }
  res.send({
    success: true,
    roomId: req.params.id,
  });
}

export default function socketHandlers(socket: Socket, io: Server) {
  socket.on("get room settings", (url: string) =>
    getRoomSettings({ socket, io })
  );
}

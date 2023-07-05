import { Request, Response } from "express";

import {
  createRoomId,
  persistRoom,
  withDefaults,
} from "../operations/createRoom";
import { checkUserChallenge } from "../operations/userChallenge";

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

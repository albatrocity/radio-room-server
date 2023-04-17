import { Emoji } from "@emoji-mart/data";
import { Server, Socket } from "socket.io";

import {
  addReaction,
  removeReaction,
  startListening,
  stopListening,
} from "../handlers/activityHandlers";
import { ReactionSubject } from "../types/ReactionSubject";
import { User } from "../types/User";

export default function activityController(socket: Socket, io: Server) {
  socket.on("start listening", () => startListening({ socket, io }));

  socket.on("stop listening", () => stopListening({ socket, io }));

  socket.on(
    "add reaction",
    ({
      emoji,
      reactTo,
      user,
    }: {
      emoji: Emoji & { shortcodes: string[] };
      reactTo: ReactionSubject;
      user: User;
    }) => addReaction({ socket, io }, { emoji, reactTo, user })
  );

  socket.on(
    "remove reaction",
    ({
      emoji,
      reactTo,
      user,
    }: {
      emoji: Emoji & { shortcodes: string[] };
      reactTo: ReactionSubject;
      user: User;
    }) => removeReaction({ socket, io }, { emoji, reactTo, user })
  );
}

import { Emoji } from "../types/Emoji";
import { Server, Socket } from "socket.io";

import {
  addReaction,
  removeReaction,
  startListening,
  stopListening,
  handlePlaybackPaused,
  handlePlaybackResumed,
} from "../handlers/activityHandlers";
import { ReactionSubject } from "../types/ReactionSubject";
import { User } from "../types/User";
import { events } from "../lib/eventEmitter";

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
      emoji: Emoji;
      reactTo: ReactionSubject;
      user: User;
    }) => {
      return addReaction({ socket, io }, { emoji, reactTo, user });
    }
  );

  socket.on(
    "remove reaction",
    ({
      emoji,
      reactTo,
      user,
    }: {
      emoji: Emoji;
      reactTo: ReactionSubject;
      user: User;
    }) => {
      return removeReaction({ socket, io }, { emoji, reactTo, user });
    }
  );
}

export function lifecycleEvents(io: Server) {
  events.on("PLAYBACK_PAUSED", (data: { user: User; users: User[] }) => {
    handlePlaybackPaused({ io });
  });
  events.on("PLAYBACK_RESUMED", (data: { user: User; users: User[] }) => {
    handlePlaybackResumed({ io });
  });
}

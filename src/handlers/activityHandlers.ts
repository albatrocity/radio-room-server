import { reject } from "remeda";

import { REACTIONABLE_TYPES } from "../lib/constants";
import { getters, setters } from "../lib/dataStore";
import updateUserAttributes from "../lib/updateUserAttributes";
import systemMessage from "../lib/systemMessage";
import sendMessage from "../lib/sendMessage";
import { processTriggerAction } from "../operations/processTriggerAction";

import { HandlerConnections } from "../types/HandlerConnections";
import { ReactionSubject } from "../types/ReactionSubject";
import { User } from "../types/User";
import { ReactionPayload } from "../types/Reaction";
import { Emoji } from "../types/Emoji";

export function startListening({ socket, io }: HandlerConnections) {
  const { user, users } = updateUserAttributes(socket.data.userId, {
    status: "listening",
  });
  io.emit("event", {
    type: "USER_JOINED",
    data: {
      user,
      users,
    },
  });
}

export function stopListening({ socket, io }: HandlerConnections) {
  const { user, users } = updateUserAttributes(socket.data.userId, {
    status: "participating",
  });
  io.emit("event", {
    type: "USER_JOINED",
    data: {
      user,
      users,
    },
  });
}

export function addReaction(
  { io }: HandlerConnections,
  { emoji, reactTo, user }: ReactionPayload
) {
  if (REACTIONABLE_TYPES.indexOf(reactTo.type) === -1) {
    return;
  }
  const currentReactions = getters.getReactions();
  const newReactions = {
    ...currentReactions,
    [reactTo.type]: {
      ...currentReactions[reactTo.type],
      [reactTo.id]: [
        currentReactions[reactTo.type][reactTo.id] || [],
        { emoji: emoji.shortcodes, user: user.userId },
      ],
    },
  };
  const reactions = setters.setReactions(newReactions);
  io.emit("event", { type: "REACTIONS", data: { reactions } });
  processTriggerAction<ReactionPayload>(
    {
      type: "reaction",
      data: { emoji, reactTo, user },
    },
    io
  );
}

export function removeReaction(
  { io }: HandlerConnections,
  {
    emoji,
    reactTo,
    user,
  }: {
    emoji: Emoji;
    reactTo: ReactionSubject;
    user: User;
  }
) {
  if (REACTIONABLE_TYPES.indexOf(reactTo.type) === -1) {
    return;
  }
  const currentReactions = getters.getReactions();

  const newReactions = {
    ...currentReactions,
    [reactTo.type]: {
      ...currentReactions[reactTo.type],
      [reactTo.id]: reject(
        currentReactions[reactTo.type][reactTo.id] || [],
        (x) => x.emoji === emoji.shortcodes && x.user === user.userId
      ),
    },
  };
  const reactions = setters.setReactions(newReactions);
  io.emit("event", { type: "REACTIONS", data: { reactions } });
  processTriggerAction<ReactionPayload>(
    {
      type: "reaction",
      data: { emoji, reactTo, user },
    },
    io
  );
}

export function handlePlaybackPaused({ io }: { io: HandlerConnections["io"] }) {
  const newMessage = systemMessage("Server playback has been paused", {
    type: "alert",
  });
  sendMessage(io, newMessage);
}

export function handlePlaybackResumed({
  io,
}: {
  io: HandlerConnections["io"];
}) {
  const newMessage = systemMessage("Server playback has been resumed", {
    type: "alert",
  });
  sendMessage(io, newMessage);
}

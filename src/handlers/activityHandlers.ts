import { reject } from "remeda";

import { REACTIONABLE_TYPES } from "../lib/constants";
import { getters, setters } from "../lib/dataStore";
import updateUserAttributes from "../lib/updateUserAttributes";
import systemMessage from "../lib/systemMessage";
import sendMessage from "../lib/sendMessage";
import { processTriggerAction } from "../operations/processTriggerAction";
import { addReaction as addReactionData } from "../operations/data";

import { HandlerConnections } from "../types/HandlerConnections";
import { ReactionSubject } from "../types/ReactionSubject";
import { User } from "../types/User";
import { ReactionPayload } from "../types/Reaction";
import { Emoji } from "../types/Emoji";
import getRoomPath from "../lib/getRoomPath";

export function startListening({ socket, io }: HandlerConnections) {
  const { user, users } = updateUserAttributes(socket.data.userId, {
    status: "listening",
  });
  io.to(getRoomPath(socket.data.roomId)).emit("event", {
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
  io.to(getRoomPath(socket.data.roomId)).emit("event", {
    type: "USER_JOINED",
    data: {
      user,
      users,
    },
  });
}

export async function addReaction(
  { io, socket }: HandlerConnections,
  reaction: ReactionPayload
) {
  const { emoji, reactTo, user } = reaction;
  if (REACTIONABLE_TYPES.indexOf(reactTo.type) === -1) {
    return;
  }
  const currentReactions = getters.getReactions();
  const newReactions = {
    ...currentReactions,
    [reactTo.type]: {
      ...currentReactions[reactTo.type],
      [reactTo.id]: [
        ...(currentReactions[reactTo.type][reactTo.id] || []),
        { emoji: emoji.shortcodes, user: user.userId },
      ],
    },
  };
  const reactions = setters.setReactions(newReactions);
  await addReactionData(socket.data.roomId, reaction, reactTo);
  io.to(getRoomPath(socket.data.roomId)).emit("event", {
    type: "REACTIONS",
    data: { reactions },
  });
  processTriggerAction<ReactionPayload>(
    {
      type: "reaction",
      data: { emoji, reactTo, user },
    },
    io
  );
}

export function removeReaction(
  { io, socket }: HandlerConnections,
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
  io.to(getRoomPath(socket.data.roomId)).emit("event", {
    type: "REACTIONS",
    data: { reactions },
  });
  processTriggerAction<ReactionPayload>(
    {
      type: "reaction",
      data: { emoji, reactTo, user },
    },
    io
  );
}

export function handlePlaybackPaused({ io, socket }: HandlerConnections) {
  const newMessage = systemMessage("Server playback has been paused", {
    type: "alert",
  });
  sendMessage(io, newMessage, socket.data.roomId);
}

export function handlePlaybackResumed({ io, socket }: HandlerConnections) {
  const newMessage = systemMessage("Server playback has been resumed", {
    type: "alert",
  });
  sendMessage(io, newMessage, socket.data.roomId);
}

import { reject, takeRight } from "lodash/fp";

import { Emoji } from "@emoji-mart/data";
import { REACTIONABLE_TYPES } from "../lib/constants";
import { getters, setters } from "../lib/dataStore";
import updateUserAttributes from "../lib/updateUserAttributes";
import { processTriggerAction } from "../operations/processTrigger";

import { HandlerConnections } from "../types/HandlerConnections";
import { ReactionSubject } from "../types/ReactionSubject";
import { User } from "../types/User";
import { ReactionPayload } from "types/Reaction";

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
        ...takeRight(199, currentReactions[reactTo.type][reactTo.id] || []),
        { emoji: emoji.shortcodes, user: user.userId },
      ],
    },
  };
  const reactions = setters.setReactions(newReactions);
  io.emit("event", { type: "REACTIONS", data: { reactions } });
  processTriggerAction({ type: "reaction", data: { emoji, reactTo, user } });
}

export function removeReaction(
  { io }: HandlerConnections,
  {
    emoji,
    reactTo,
    user,
  }: {
    emoji: Emoji & { shortcodes: string[] };
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
        { emoji: emoji.shortcodes, user: user.userId },
        currentReactions[reactTo.type][reactTo.id] || []
      ),
    },
  };
  const reactions = setters.setReactions(newReactions);
  io.emit("event", { type: "REACTIONS", data: { reactions } });
}

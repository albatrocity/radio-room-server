import performTriggerAction from "./performTriggerAction";
import { getters } from "../lib/dataStore";
import {
  TriggerAction,
  TriggerSourceEvent,
  TriggerConditions,
  WithTriggerMeta,
  TriggerTarget,
} from "../types/Triggers";
import { Reaction, ReactionPayload } from "types/Reaction";
import { Server } from "socket.io";
import { ChatMessage } from "types/ChatMessage";

function getThresholdValue<T>(count: number, conditions: TriggerConditions<T>) {
  if (conditions.thresholdType === "count") {
    return conditions.threshold;
  }

  return count * (conditions.threshold / 100);
}

function getCompareTo(target?: TriggerTarget) {
  return {
    listeners: getters
      .getUsers()
      .filter(({ status }) => status === "listening"),
    users: getters.getUsers(),
    messages: getters.getMessages(),
    reactions: target
      ? getters.getReactions()[target?.type][target?.id] || []
      : [],
  };
}

function meetsThreshold<S, T>(
  count: number,
  conditions: TriggerConditions<T>,
  data: WithTriggerMeta<S, T>
) {
  const compareTo = conditions.compareTo
    ? data.meta.compareTo?.[conditions.compareTo] || data.meta.sourcesOnSubject
    : data.meta.sourcesOnSubject;

  const threshValue = getThresholdValue<T>(compareTo.length, conditions);

  switch (conditions.comparator) {
    case "<":
      return count < threshValue;
    case "<=":
      return count <= threshValue;
    case "=":
      return count == threshValue;
    case ">":
      return count > threshValue;
    case ">=":
      return count >= threshValue;
  }
}

export function processTrigger<S, T>(
  data: WithTriggerMeta<S, T>,
  trigger: TriggerAction<T>,
  io: Server
) {
  const eligible = data.meta.sourcesOnSubject.filter((x) =>
    trigger.conditions.qualifier(x)
  );

  if (meetsThreshold<S, T>(eligible.length, trigger.conditions, data)) {
    performTriggerAction<S, T>(data, trigger, io);
  }
}

export function processReactionTriggers(
  data: ReactionPayload,
  triggers: TriggerAction<Reaction>[],
  io: Server
) {
  triggers.map((t) => {
    const currentReactions = getters.getReactions()[data.reactTo.type][
      data.reactTo.id
    ];
    const target = getActionTarget(t.target);
    return processTrigger<ReactionPayload, Reaction>(
      {
        ...data,
        meta: {
          sourcesOnSubject: currentReactions,
          compareTo: getCompareTo(t.target),
          target,
        },
      },
      t,
      io
    );
  });
}

export function processMessageTriggers(
  data: ChatMessage,
  triggers: TriggerAction<ChatMessage>[],
  io: Server
) {
  triggers.map((t) => {
    const currentMessages = getters.getMessages();
    const target = getActionTarget(t.target);
    return processTrigger<ChatMessage, ChatMessage>(
      {
        ...data,
        meta: {
          sourcesOnSubject: currentMessages,
          compareTo: getCompareTo(t.target),
          target,
          ...t.meta,
        },
      },
      t,
      io
    );
  });
}

export function processTriggerAction<T>(
  { type, data }: TriggerSourceEvent<T>,
  io: Server
) {
  const triggerActions = getters.getTriggerActions();
  switch (type) {
    case "reaction":
      return processReactionTriggers(
        data as ReactionPayload,
        triggerActions.filter((a) => a.on === "reaction"),
        io
      );
    case "message":
      return processMessageTriggers(
        data as ChatMessage,
        triggerActions.filter((a) => a.on === "message"),
        io
      );
  }
}

function getActionTarget(target?: TriggerTarget) {
  if (!target) {
    return undefined;
  }

  switch (target.type) {
    case "track":
      return getTargetTrack(target);
  }
}

function getTargetTrack(target: TriggerTarget) {
  const playlist = getters.getPlaylist();
  if (target.id === "latest") {
    return playlist[playlist.length - 1];
  } else {
    return playlist.find((t) => t.spotifyData?.uri === target.id);
  }
}

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
import { PlaylistTrack } from "types/PlaylistTrack";

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
  trigger: TriggerAction,
  data: WithTriggerMeta<S, T>
) {
  const { conditions } = trigger;

  const instances = getters
    .getTriggerEvents()
    [trigger.subject.type].filter((event) => {
      return (
        event.on === trigger.on &&
        event.conditions === trigger.conditions &&
        event.subject === trigger.subject &&
        event.target === trigger.target &&
        event.type === trigger.type
      );
    });

  console.log("instances");
  console.log(instances);

  if (conditions.maxTimes && instances.length >= conditions.maxTimes) {
    return false;
  }

  const compareTo = conditions.compareTo
    ? data.meta.compareTo?.[conditions.compareTo] || data.meta.sourcesOnSubject
    : data.meta.sourcesOnSubject;

  const threshValue = getThresholdValue<S>(compareTo.length, conditions);

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
  trigger: TriggerAction,
  io: Server
) {
  const eligible = data.meta.sourcesOnSubject.filter((x) =>
    trigger.conditions.qualifier(x)
  );

  if (meetsThreshold<S, T>(eligible.length, trigger, data)) {
    performTriggerAction<S, T>(data, trigger, io);
  }
}

export function processReactionTriggers(
  data: ReactionPayload,
  triggers: TriggerAction[],
  io: Server
) {
  triggers.map((t) => {
    const currentReactions = getters.getReactions()[data.reactTo.type][
      data.reactTo.id
    ];
    const target = getActionTarget(t.target);
    const trigger = captureTriggerTarget<ReactionPayload, Reaction>(
      t as TriggerAction,
      data
    );
    return processTrigger<ReactionPayload, Reaction>(
      {
        ...data,
        meta: {
          sourcesOnSubject: currentReactions,
          compareTo: getCompareTo(t.target),
          target,
          ...trigger.meta,
        },
      },
      trigger as TriggerAction,
      io
    );
  });
}

export function processMessageTriggers(
  data: ChatMessage,
  triggers: TriggerAction[],
  io: Server
) {
  triggers.map((t) => {
    const currentMessages = getters.getMessages();
    const target = getActionTarget(t.target);
    const trigger = captureTriggerTarget<ChatMessage, ChatMessage>(
      t as TriggerAction,
      data
    );
    return processTrigger<ChatMessage, ChatMessage>(
      {
        ...data,
        meta: {
          sourcesOnSubject: currentMessages,
          compareTo: getCompareTo(t.target),
          target,
          ...trigger.meta,
        },
      },
      trigger as TriggerAction,
      io
    );
  });
}

/**
 * Finds and executes all relevant triggers for the source event
 */
export function processTriggerAction(
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

/**
 * Finds and returns the full Target of the Trigger
 */
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

/**
 * Returns Trigger with identified Target if using the 'latest' id alias
 */
function captureTriggerTarget<S, T>(trigger: TriggerAction, data: S) {
  if (trigger.target?.id === "latest") {
    const target = getActionTarget(trigger.target);
    return {
      ...trigger,
      target: {
        type: trigger.target.type,
        id: getTriggerTargetId(trigger.target, target),
      },
    };
  }
  return trigger;
}

function getTriggerTargetId(
  target: TriggerTarget,
  foundTarget?: PlaylistTrack
) {
  if (target.type === "track") {
    return foundTarget?.spotifyData?.uri;
  }
  return undefined;
}

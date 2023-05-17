import performTriggerAction from "./performTriggerAction";
import { getters } from "../lib/dataStore";
import {
  TriggerEvent,
  TriggerSourceEvent,
  TriggerConditions,
  WithTriggerMeta,
  TriggerTarget,
  TriggerQualifier,
  ReactionTriggerEvent,
  MessageTriggerEvent,
  TriggerMeta,
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
    reactions:
      target && target.id
        ? getters.getReactions()[target.type][target.id] || []
        : [],
  };
}

function meetsThreshold<Incoming, Source>(
  count: number,
  trigger: TriggerEvent<Source>,
  data: WithTriggerMeta<Incoming, Source>
) {
  const { conditions } = trigger;
  if (!conditions) {
    return true;
  }
  const instances = getters.getTriggerEventHistory().filter((event) => {
    const matchOn = event.on === trigger.on;
    const matchConditions = event.conditions === trigger.conditions;
    const matchSubject = event.subject === trigger.subject;
    const matchTargetId = event.target?.id === trigger.target?.id;
    const matchTargetType = event.target?.type === trigger.target?.type;
    const matchAction = event.action === trigger.action;
    return (
      matchOn &&
      matchConditions &&
      matchSubject &&
      matchTargetId &&
      matchTargetType &&
      matchAction
    );
  });

  if (conditions.maxTimes && instances.length >= conditions.maxTimes) {
    return false;
  }

  const compareTo = conditions.compareTo
    ? data.meta.compareTo?.[conditions.compareTo] || data.meta.sourcesOnSubject
    : data.meta.sourcesOnSubject;

  const threshValue = getThresholdValue<Source>(compareTo.length, conditions);

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

export function processTrigger<Incoming, Source>(
  data: WithTriggerMeta<Incoming, Source>,
  trigger: TriggerEvent<Source>,
  io: Server
) {
  const eligible = data.meta.sourcesOnSubject.filter((x) => {
    if (trigger.conditions) {
      return makeQualifierFn<Source>(trigger.conditions.qualifier, x);
    } else {
      return true;
    }
  });

  if (meetsThreshold<Incoming, Source>(eligible.length, trigger, data)) {
    performTriggerAction<Incoming, Source>(data, trigger, io);
  }
}

export function processReactionTriggers(
  data: ReactionPayload,
  triggers: ReactionTriggerEvent[],
  io: Server
) {
  triggers.map((t) => {
    const currentReactions = getters.getReactions()[data.reactTo.type][
      data.reactTo.id
    ];
    const target = getActionTarget(t.target);
    const trigger = captureTriggerTarget<Reaction>(t);
    const meta: TriggerMeta<Reaction> = {
      sourcesOnSubject: currentReactions,
      compareTo: getCompareTo(t.target),
      target,
      ...trigger.meta,
    };

    return processTrigger<ReactionPayload, Reaction>(
      {
        ...data,
        meta,
      },
      trigger,
      io
    );
  });
}

export function processMessageTriggers(
  data: ChatMessage,
  triggers: MessageTriggerEvent[],
  io: Server
) {
  triggers.map((t) => {
    const currentMessages = getters.getMessages();
    const target = getActionTarget(t.target);
    const trigger = captureTriggerTarget(t);
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
      trigger,
      io
    );
  });
}

/**
 * Finds and executes all relevant triggers for the source event
 */
export function processTriggerAction<T extends ReactionPayload | ChatMessage>(
  { type, data }: TriggerSourceEvent<T>,
  io: Server
) {
  switch (type) {
    case "reaction":
      return processReactionTriggers(
        data as ReactionPayload,
        getters.getReactionTriggerEvents(),
        io
      );
    case "message":
      return processMessageTriggers(
        data as ChatMessage,
        getters.getMessageTriggerEvents(),
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
function captureTriggerTarget<T>(trigger: TriggerEvent<T>) {
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

function makeQualifierFn<Source>(
  qualifier: TriggerQualifier<Source>,
  data: Source
) {
  const source = data[qualifier.sourceAttribute];
  switch (qualifier.comparator) {
    case "equals":
      return source == qualifier.determiner;
    case "includes":
      return (source as string).includes(qualifier.determiner);
  }
}

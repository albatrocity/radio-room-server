import { MessageTriggerEvent, ReactionTriggerEvent } from "../types/Triggers";

const skipUnlikedTracks: ReactionTriggerEvent = {
  action: "skipTrack",
  on: "reaction",
  subject: {
    type: "track",
    id: "latest",
  },
  target: {
    type: "track",
    id: "latest",
  },
  conditions: {
    comparator: ">",
    threshold: 50,
    thresholdType: "percent",
    qualifier: {
      sourceAttribute: "emoji",
      comparator: "equals",
      determiner: ":-1:",
    },
    compareTo: "listeners",
    maxTimes: 1,
  },
  meta: {
    messageTemplate: "{{target.title}} was democratically skipped",
  },
};

const likeTrack: ReactionTriggerEvent = {
  action: "likeTrack",
  on: "reaction",
  subject: {
    type: "track",
    id: "latest",
  },
  target: {
    type: "track",
    id: "latest",
  },
  conditions: {
    comparator: ">",
    threshold: 50,
    thresholdType: "percent",
    qualifier: {
      sourceAttribute: "emoji",
      comparator: "equals",
      determiner: ":+1:",
    },
    compareTo: "listeners",
    maxTimes: 1,
  },
};

const clowns: ReactionTriggerEvent = {
  action: "sendMessage",
  on: "reaction",
  subject: {
    type: "track",
    id: "latest",
  },
  target: {
    type: "track",
    id: "latest",
  },
  conditions: {
    comparator: ">=",
    threshold: 1,
    thresholdType: "count",
    qualifier: {
      sourceAttribute: "emoji",
      comparator: "equals",
      determiner: ":clown_face:",
    },
    maxTimes: Infinity,
  },
  meta: {
    messageTemplate: "There are too many clowns in here.",
  },
};

const mess: MessageTriggerEvent = {
  action: "sendMessage",
  on: "message",
  subject: {
    type: "track",
    id: "latest",
  },
  target: {
    type: "track",
    id: "latest",
  },
  conditions: {
    comparator: ">=",
    threshold: 1,
    thresholdType: "count",
    qualifier: {
      sourceAttribute: "content",
      comparator: "includes",
      determiner: "clowns",
    },
    maxTimes: 1,
  },
  meta: {
    messageTemplate: "NO TALKING ABOUT CLOWNS!",
  },
};

export const defaultReactionTriggerEvents = [
  skipUnlikedTracks,
  likeTrack,
  clowns,
];
export const defaultMessageTriggerEvents = [mess];

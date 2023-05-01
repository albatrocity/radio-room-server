import { TriggerAction } from "../types/Triggers";

const skipUnlikedTracks: TriggerAction = {
  type: "skipTrack",
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

const likeTrack: TriggerAction = {
  type: "likeTrack",
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

const clowns: TriggerAction = {
  type: "sendMessage",
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

const mess: TriggerAction = {
  type: "sendMessage",
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

export default [skipUnlikedTracks, likeTrack, clowns, mess];

import { Reaction } from "../types/Reaction";
import { TriggerAction } from "../types/Triggers";

const skipUnlikedTracks: TriggerAction<Reaction> = {
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
    qualifier(source) {
      return source.emoji == ":-1:";
    },
    compareTo: "listeners",
    maxTimes: 1,
  },
};

const likeTrack: TriggerAction<Reaction> = {
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
    qualifier(source) {
      return source.emoji == ":+1:";
    },
    compareTo: "listeners",
    maxTimes: 1,
  },
};

const clowns: TriggerAction<Reaction> = {
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
    qualifier(source) {
      return source.emoji == ":clown_face:";
    },
    maxTimes: Infinity,
  },
  meta: {
    template: "There are too many clowns in here.",
  },
};

export default [skipUnlikedTracks, likeTrack, clowns];

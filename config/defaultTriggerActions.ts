import { ChatMessage } from "types/ChatMessage";
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
  meta: {
    messageTemplate: "{{target.title}} was democratically skipped",
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
    messageTemplate: "There are too many clowns in here.",
  },
};

const mess: TriggerAction<ChatMessage> = {
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
    qualifier(source) {
      return source.content.includes("clowns");
    },
    maxTimes: 1,
  },
  meta: {
    messageTemplate: "NO TALKING ABOUT CLOWNS!",
  },
};

export default [skipUnlikedTracks, likeTrack, clowns, mess];

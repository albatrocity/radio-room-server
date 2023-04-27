import { ReactionPayload } from "../types/Reaction";
import { TriggerAction } from "../types/Triggers";

const skipUnlikedTracks: TriggerAction<ReactionPayload> = {
  type: "skipTrack",
  on: "reaction",
  subject: {
    type: "track",
    id: "latest",
  },
  conditions: {
    comparator: ">",
    threshold: 50,
    thresholdType: "percent",
    qualifier(source) {
      return source.emoji.shortcodes === ":-1:";
    },
    compareTo: "listeners",
  },
};

export default [skipUnlikedTracks];

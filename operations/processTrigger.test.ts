import { describe, test } from "@jest/globals";
import { TriggerAction } from "../types/Triggers";
import { processReactionTrigger } from "./processTrigger";
import { Reaction } from "../types/Reaction";
import performTriggerAction from "./performTriggerAction";

jest.mock("./performTriggerAction");

const skipTrigger: TriggerAction<Reaction> = {
  on: "reaction",
  subject: {
    type: "track",
    id: "latest",
  },
  type: "skipTrack",
  conditions: {
    determiner: "listeners",
    quantifier: ">",
    threshold: 2,
    thresholdType: "count",
    qualifier: (source) => source.emoji.includes(":-1:"),
  },
};

const homer = {
  username: "Homer",
  userId: "1",
};
const marge = {
  username: "Marge",
  userId: "2",
};
const lisa = {
  username: "Lisa",
  userId: "3",
};
const bart = {
  username: "Bart",
  userId: "4",
};
const maggie = {
  username: "Maggie",
  userId: "5",
};

const thumbsDownEmoji = {
  name: "thumbs_down",
  shortcodes: [":-1:", ":thumbs_down:"],
  id: "thumbs_down",
  keywords: [],
  skins: [],
  version: 1,
};

describe("processReactionTrigger", () => {
  describe("conditions", () => {
    describe("threshold", () => {
      describe("count", () => {
        test("skips when threshold is not met", () => {
          const reaction = {
            emoji: thumbsDownEmoji,
            reactTo: {
              type: "track" as const,
              id: "track1",
            },
            user: {
              username: "Homer",
              userId: "1",
            },
            meta: {
              sourcesOnSubject: [],
            },
          };

          processReactionTrigger(reaction, skipTrigger);

          expect(performTriggerAction).not.toHaveBeenCalled();
        });

        test("calls when threshold is met", () => {
          const reaction = {
            emoji: thumbsDownEmoji,
            reactTo: {
              type: "track" as const,
              id: "track1",
            },
            user: homer,
            meta: {
              sourcesOnSubject: [
                { emoji: [":-1:"], user: marge.userId },
                { emoji: [":-1:"], user: lisa.userId },
                { emoji: [":-1:"], user: homer.userId },
              ],
            },
          };

          processReactionTrigger(reaction, skipTrigger);

          expect(performTriggerAction).toHaveBeenCalled();
        });
      });
    });
  });
});

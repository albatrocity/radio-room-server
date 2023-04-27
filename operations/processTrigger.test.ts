import { describe, test, afterEach } from "@jest/globals";
import { TriggerAction } from "../types/Triggers";
import { processReactionTrigger } from "./processTrigger";
import { Reaction, ReactionPayload } from "../types/Reaction";
import performTriggerAction from "./performTriggerAction";
import { WithMeta } from "../types/Utility";
import { Emoji } from "@emoji-mart/data";
import { User } from "../types/User";

jest.mock("./performTriggerAction");

function stubTrigger({
  on = "reaction",
  subject = {
    type: "track",
    id: "latest",
  },
  type = "skipTrack",
  conditions = {
    determiner: "listeners",
    quantifier: ">",
    threshold: 2,
    thresholdType: "count",
    qualifier: (source) => source.emoji.includes(":-1:"),
  },
}: Partial<TriggerAction<Reaction>>) {
  return {
    on,
    subject,
    type,
    conditions,
  };
}

function stubReaction({
  emoji = thumbsDownEmoji,
  user = homer,
  reactTo = {
    type: "track" as const,
    id: "track1",
  },
  meta = {
    sourcesOnSubject: [],
  },
}: Partial<WithMeta<ReactionPayload, Reaction>>): WithMeta<
  ReactionPayload,
  Reaction
> {
  return {
    emoji,
    reactTo,
    user,
    meta,
  };
}

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

afterEach(() => {
  jest.resetAllMocks();
});

describe("processReactionTrigger", () => {
  describe("conditions", () => {
    describe("count", () => {
      describe("<", () => {
        const trigger = stubTrigger({
          conditions: {
            quantifier: "<",
            threshold: 2,
            thresholdType: "count",
            qualifier: (source) => source.emoji.includes(":-1:"),
          },
        });
        test("skips when threshold is not met", () => {
          const reaction = stubReaction({
            meta: {
              sourcesOnSubject: [
                { emoji: [":-1:"], user: marge.userId },
                { emoji: [":-1:"], user: marge.userId },
              ],
            },
          });

          processReactionTrigger(reaction, trigger);

          expect(performTriggerAction).not.toHaveBeenCalled();
        });

        test("calls when threshold is met", () => {
          const reaction = stubReaction({
            meta: {
              sourcesOnSubject: [{ emoji: [":-1:"], user: marge.userId }],
            },
          });

          processReactionTrigger(reaction, trigger);

          expect(performTriggerAction).toHaveBeenCalled();
        });
      });

      describe("<=", () => {
        const trigger = stubTrigger({
          conditions: {
            quantifier: "<=",
            threshold: 2,
            thresholdType: "count",
            qualifier: (source) => source.emoji.includes(":-1:"),
          },
        });
        test("skips when threshold is not met", () => {
          const reaction = stubReaction({
            meta: {
              sourcesOnSubject: [
                { emoji: [":-1:"], user: marge.userId },
                { emoji: [":-1:"], user: lisa.userId },
                { emoji: [":-1:"], user: homer.userId },
              ],
            },
          });

          processReactionTrigger(reaction, trigger);

          expect(performTriggerAction).not.toHaveBeenCalled();
        });

        test("calls when threshold is met", () => {
          const reaction = stubReaction({
            meta: {
              sourcesOnSubject: [
                { emoji: [":-1:"], user: marge.userId },
                { emoji: [":-1:"], user: homer.userId },
              ],
            },
          });

          processReactionTrigger(reaction, trigger);

          expect(performTriggerAction).toHaveBeenCalled();
        });
      });

      describe("=", () => {
        const trigger = stubTrigger({
          conditions: {
            quantifier: "=",
            threshold: 2,
            thresholdType: "count",
            qualifier: (source) => source.emoji.includes(":-1:"),
          },
        });
        test("skips when threshold is not met", () => {
          const reaction = stubReaction({
            meta: {
              sourcesOnSubject: [
                { emoji: [":-1:"], user: marge.userId },
                { emoji: [":-1:"], user: lisa.userId },
                { emoji: [":-1:"], user: homer.userId },
              ],
            },
          });

          processReactionTrigger(reaction, trigger);

          expect(performTriggerAction).not.toHaveBeenCalled();
        });

        test("calls when threshold is met", () => {
          const reaction = stubReaction({
            meta: {
              sourcesOnSubject: [
                { emoji: [":-1:"], user: marge.userId },
                { emoji: [":-1:"], user: homer.userId },
              ],
            },
          });

          processReactionTrigger(reaction, trigger);

          expect(performTriggerAction).toHaveBeenCalled();
        });
      });

      describe(">", () => {
        const trigger = stubTrigger({
          conditions: {
            quantifier: ">",
            threshold: 2,
            thresholdType: "count",
            qualifier: (source) => source.emoji.includes(":-1:"),
          },
        });
        test("skips when threshold is not met", () => {
          const reaction = stubReaction({
            meta: {
              sourcesOnSubject: [{ emoji: [":-1:"], user: marge.userId }],
            },
          });

          processReactionTrigger(reaction, trigger);

          expect(performTriggerAction).not.toHaveBeenCalled();
        });

        test("calls when threshold is met", () => {
          const reaction = stubReaction({
            meta: {
              sourcesOnSubject: [
                { emoji: [":-1:"], user: marge.userId },
                { emoji: [":-1:"], user: lisa.userId },
                { emoji: [":-1:"], user: homer.userId },
              ],
            },
          });

          processReactionTrigger(reaction, trigger);

          expect(performTriggerAction).toHaveBeenCalled();
        });
      });

      describe(">=", () => {
        const trigger = stubTrigger({
          conditions: {
            quantifier: ">=",
            threshold: 2,
            thresholdType: "count",
            qualifier: (source) => source.emoji.includes(":-1:"),
          },
        });
        test("skips when threshold is not met", () => {
          const reaction = stubReaction({
            meta: {
              sourcesOnSubject: [{ emoji: [":-1:"], user: marge.userId }],
            },
          });

          processReactionTrigger(reaction, trigger);

          expect(performTriggerAction).not.toHaveBeenCalled();
        });

        test("calls when threshold is met", () => {
          const reaction = stubReaction({
            meta: {
              sourcesOnSubject: [
                { emoji: [":-1:"], user: marge.userId },
                { emoji: [":-1:"], user: lisa.userId },
                { emoji: [":-1:"], user: homer.userId },
              ],
            },
          });

          processReactionTrigger(reaction, trigger);

          expect(performTriggerAction).toHaveBeenCalled();
        });
      });
    });
    describe("percent", () => {
      describe("<", () => {
        const trigger = stubTrigger({
          conditions: {
            quantifier: "<",
            threshold: 50,
            thresholdType: "percent",
            qualifier: (source) => source.emoji.includes(":-1:"),
          },
        });
        test("skips when threshold is not met", () => {
          const reaction = stubReaction({
            meta: {
              sourcesOnSubject: [
                { emoji: [":-1:"], user: marge.userId },
                { emoji: [":-1:"], user: marge.userId },
                { emoji: [":+1:"], user: marge.userId },
              ],
            },
          });

          processReactionTrigger(reaction, trigger);

          expect(performTriggerAction).not.toHaveBeenCalled();
        });

        test("calls when threshold is met", () => {
          const reaction = stubReaction({
            meta: {
              sourcesOnSubject: [
                { emoji: [":-1:"], user: marge.userId },
                { emoji: [":+1:"], user: marge.userId },
                { emoji: [":+1:"], user: marge.userId },
              ],
            },
          });

          processReactionTrigger(reaction, trigger);

          expect(performTriggerAction).toHaveBeenCalled();
        });
      });

      describe("<=", () => {
        const trigger = stubTrigger({
          conditions: {
            quantifier: "<=",
            threshold: 50,
            thresholdType: "percent",
            qualifier: (source) => source.emoji.includes(":-1:"),
          },
        });
        test("skips when threshold is not met", () => {
          const reaction = stubReaction({
            meta: {
              sourcesOnSubject: [
                { emoji: [":-1:"], user: marge.userId },
                { emoji: [":-1:"], user: lisa.userId },
                { emoji: [":-1:"], user: maggie.userId },
                { emoji: [":+1:"], user: bart.userId },
                { emoji: [":+1:"], user: homer.userId },
              ],
            },
          });

          processReactionTrigger(reaction, trigger);

          expect(performTriggerAction).not.toHaveBeenCalled();
        });

        test("calls when threshold is met", () => {
          const reaction = stubReaction({
            meta: {
              sourcesOnSubject: [
                { emoji: [":-1:"], user: marge.userId },
                { emoji: [":-1:"], user: lisa.userId },
                { emoji: [":+1:"], user: bart.userId },
                { emoji: [":+1:"], user: homer.userId },
              ],
            },
          });

          processReactionTrigger(reaction, trigger);

          expect(performTriggerAction).toHaveBeenCalled();
        });
      });

      describe("=", () => {
        const trigger = stubTrigger({
          conditions: {
            quantifier: "=",
            threshold: 50,
            thresholdType: "percent",
            qualifier: (source) => source.emoji.includes(":-1:"),
          },
        });
        test("skips when threshold is not met", () => {
          const reaction = stubReaction({
            meta: {
              sourcesOnSubject: [
                { emoji: [":-1:"], user: marge.userId },
                { emoji: [":-1:"], user: lisa.userId },
                { emoji: [":-1:"], user: homer.userId },
              ],
            },
          });

          processReactionTrigger(reaction, trigger);

          expect(performTriggerAction).not.toHaveBeenCalled();
        });

        test("calls when threshold is met", () => {
          const reaction = stubReaction({
            meta: {
              sourcesOnSubject: [
                { emoji: [":-1:"], user: marge.userId },
                { emoji: [":+1:"], user: homer.userId },
              ],
            },
          });

          processReactionTrigger(reaction, trigger);

          expect(performTriggerAction).toHaveBeenCalled();
        });
      });

      describe(">", () => {
        const trigger = stubTrigger({
          conditions: {
            quantifier: ">",
            threshold: 50,
            thresholdType: "percent",
            qualifier: (source) => source.emoji.includes(":-1:"),
          },
        });
        test("skips when threshold is not met", () => {
          const reaction = stubReaction({
            meta: {
              sourcesOnSubject: [
                { emoji: [":-1:"], user: marge.userId },
                { emoji: [":+1:"], user: homer.userId },
              ],
            },
          });

          processReactionTrigger(reaction, trigger);

          expect(performTriggerAction).not.toHaveBeenCalled();
        });

        test("calls when threshold is met", () => {
          const reaction = stubReaction({
            meta: {
              sourcesOnSubject: [
                { emoji: [":+1:"], user: maggie.userId },
                { emoji: [":-1:"], user: marge.userId },
                { emoji: [":-1:"], user: lisa.userId },
                { emoji: [":-1:"], user: homer.userId },
              ],
            },
          });

          processReactionTrigger(reaction, trigger);

          expect(performTriggerAction).toHaveBeenCalled();
        });
      });

      describe(">=", () => {
        const trigger = stubTrigger({
          conditions: {
            quantifier: ">=",
            threshold: 50,
            thresholdType: "percent",
            qualifier: (source) => source.emoji.includes(":-1:"),
          },
        });
        test("skips when threshold is not met", () => {
          const reaction = stubReaction({
            meta: {
              sourcesOnSubject: [
                { emoji: [":-1:"], user: marge.userId },
                { emoji: [":+1:"], user: bart.userId },
                { emoji: [":+1:"], user: homer.userId },
              ],
            },
          });

          processReactionTrigger(reaction, trigger);

          expect(performTriggerAction).not.toHaveBeenCalled();
        });

        test("calls when threshold is met", () => {
          const reaction = stubReaction({
            meta: {
              sourcesOnSubject: [
                { emoji: [":-1:"], user: marge.userId },
                { emoji: [":-1:"], user: bart.userId },
                { emoji: [":+1:"], user: homer.userId },
              ],
            },
          });

          processReactionTrigger(reaction, trigger);

          expect(performTriggerAction).toHaveBeenCalled();
        });
      });
    });
  });
});

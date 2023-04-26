import performTriggerAction from "./performTriggerAction";
import { getters, setters } from "../lib/dataStore";
import {
  TriggerAction,
  TriggerSourceEvent,
  TriggerConditions,
} from "../types/Triggers";
import { Reaction, ReactionPayload } from "types/Reaction";
import { WithMeta } from "types/Utility";

function meetsThreshold<T>(count: number, conditions: TriggerConditions<T>) {
  const threshValue =
    conditions.thresholdType === "count" ? conditions.threshold : 0;

  switch (conditions.quantifier) {
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

export function processReactionTrigger(
  data: WithMeta<ReactionPayload, Reaction>,
  trigger: TriggerAction<Reaction>
) {
  const eligible = data.meta.sourcesOnSubject.filter((x) =>
    trigger.conditions.qualifier(x)
  );

  if (meetsThreshold<Reaction>(eligible.length, trigger.conditions)) {
    performTriggerAction<ReactionPayload, Reaction>(data, trigger);
  }
}

export function processReactionTriggers(
  data: ReactionPayload,
  triggers: TriggerAction<Reaction>[]
) {
  triggers.map((t) => {
    const currentReactions = getters.getReactions()[data.reactTo.type][
      data.reactTo.id
    ];
    return processReactionTrigger(
      {
        ...data,
        meta: {
          sourcesOnSubject: currentReactions,
        },
      },
      t
    );
  });
}

export function processTriggerAction({
  type,
  data,
}: TriggerSourceEvent<ReactionPayload>) {
  const triggerActions = getters.getTriggerActions();
  if (type === "reaction") {
    processReactionTriggers(data, triggerActions);
  }
}

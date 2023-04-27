import performTriggerAction from "./performTriggerAction";
import { getters, setters } from "../lib/dataStore";
import {
  TriggerAction,
  TriggerSourceEvent,
  TriggerConditions,
} from "../types/Triggers";
import { Reaction, ReactionPayload } from "types/Reaction";
import { WithMeta } from "types/Utility";

function getThresholdValue<S, T>(
  conditions: TriggerConditions<T>,
  data: WithMeta<S, T>
) {
  if (conditions.thresholdType === "count") {
    return conditions.threshold;
  }

  return data.meta.sourcesOnSubject.length * (conditions.threshold / 100);
}

function meetsThreshold<S, T>(
  count: number,
  conditions: TriggerConditions<T>,
  data: WithMeta<S, T>
) {
  const threshValue = getThresholdValue<S, T>(conditions, data);

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

  if (
    meetsThreshold<ReactionPayload, Reaction>(
      eligible.length,
      trigger.conditions,
      data
    )
  ) {
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

import { TriggerAction } from "../types/Triggers";
import { WithMeta } from "../types/Utility";

export default function performTriggerAction<S, T>(
  data: WithMeta<S, T>,
  trigger: TriggerAction<T>
) {}

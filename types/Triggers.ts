import { ChatMessage } from "./ChatMessage";
import { User } from "./User";
import { Track } from "./Track";
import { Reaction } from "./Reaction";
import { PlaylistTrack } from "./PlaylistTrack";

export type TriggerSourceEvent<T> = {
  data: T;
  type: TriggerEventType;
};

export type CompareTo = {
  listeners?: User[];
  users?: User[];
  messages?: ChatMessage[];
  tracks?: Track[];
  reactions?: Reaction[];
};

export type ResourceIdentifier = string | `latest`;
export type TriggerActionType = `skipTrack` | `likeTrack` | `sendMessage`;

export interface TriggerTarget {
  type: `track`;
  id: ResourceIdentifier;
}

export type TriggerSubjectType = `track` | `message`;
export type TriggerEventType = `reaction` | `message`;

export interface TriggerSubject {
  type: TriggerSubjectType;
  id: ResourceIdentifier;
}

export interface TriggerConditions<T> {
  compareTo?: keyof CompareTo;
  comparator: `<` | `<=` | `=` | `>` | `>=`;
  threshold: number;
  thresholdType: `percent` | `count`;
  qualifier: (source: T) => boolean;
  maxTimes?: number;
}

export interface TriggerAction<T> {
  on: TriggerEventType;
  subject: TriggerSubject;
  type: TriggerActionType;
  target?: TriggerTarget;
  conditions: TriggerConditions<T>;
  meta?: {
    messageTemplate?: string;
  };
}

export type WithTriggerMeta<T, S> = T & {
  meta: {
    sourcesOnSubject: S[];
    compareTo?: CompareTo;
    target?: PlaylistTrack;
    messageTemplate?: string;
  };
};

export type AppTriggerAction =
  | TriggerAction<Reaction>
  | TriggerAction<ChatMessage>;

import { ChatMessage } from "./ChatMessage";
import { User } from "./User";
import { Track } from "./Track";
import { Reaction } from "./Reaction";
import { PlaylistTrack } from "./PlaylistTrack";
import { WithTimestamp } from "./Utility";

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

export type TriggerConditions<T> = {
  compareTo?: keyof CompareTo;
  comparator: `<` | `<=` | `=` | `>` | `>=`;
  threshold: number;
  thresholdType: `percent` | `count`;
  qualifier: (source: T) => boolean;
  maxTimes?: number;
};

export type TriggerAction =
  | {
      on: "reaction";
      subject: TriggerSubject;
      type: TriggerActionType;
      target?: TriggerTarget;
      conditions: TriggerConditions<Reaction>;
      meta?: {
        messageTemplate?: string;
      };
    }
  | {
      on: "message";
      subject: TriggerSubject;
      type: TriggerActionType;
      target?: TriggerTarget;
      conditions: TriggerConditions<ChatMessage>;
      meta?: {
        messageTemplate?: string;
      };
    };

export type WithTriggerMeta<T, S> = T & {
  meta: {
    sourcesOnSubject: S[];
    compareTo?: CompareTo;
    target?: PlaylistTrack;
    messageTemplate?: string;
  };
};

export type TriggerEvent = WithTimestamp<
  | {
      id: ResourceIdentifier;
      type: TriggerActionType;
      target: TriggerTarget;
      subject: TriggerSubject;
      on: "reaction";
      conditions: TriggerConditions<Reaction>;
    }
  | {
      id: ResourceIdentifier;
      type: TriggerActionType;
      target: TriggerTarget;
      subject: TriggerSubject;
      on: "message";
      conditions: TriggerConditions<ChatMessage>;
    }
>;

export type TriggerEventsStore = Record<TriggerSubjectType, TriggerEvent[]>;

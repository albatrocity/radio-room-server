export type TriggerSourceEvent<T> = {
  data: T;
  type: TriggerEventType;
};

export type ResourceIdentifier = string | `latest`;
export type TriggerActionType =
  | `skipTrack`
  | `likeTrack`
  | `addTrackToPlaylist`
  | `sendMessage`;

export interface TriggerTarget {
  type: `playlist` | `track`;
  id: string;
}

export type TriggerSubjectType = `track` | `message`;
export type TriggerEventType = `reaction` | `message`;

export interface TriggerSubject {
  type: TriggerSubjectType;
  id: ResourceIdentifier;
}

export interface TriggerConditions<T> {
  determiner: `listeners` | `users` | `messages` | `tracks` | TriggerSubject;
  quantifier: `<` | `<=` | `=` | `>` | `>=`;
  threshold: number;
  thresholdType: `percent` | `count`;
  qualifier: (source: T) => boolean;
}

export interface TriggerAction<T> {
  on: TriggerEventType;
  subject: TriggerSubject;
  type: TriggerActionType;
  target?: TriggerTarget;
  conditions: TriggerConditions<T>;
}

import { ChatMessage } from "./ChatMessage";
import { PlaylistTrack } from "./PlaylistTrack";
import { QueuedTrack } from "./QueuedTrack";
import { Reaction } from "./Reaction";
import { Settings } from "./Settings";
import { Station } from "./Station";
import { User } from "./User";
import { ReactionableType } from "../lib/constants";
import { TriggerEvent, TriggerEventHistory } from "./Triggers";

export type ReactionStore = Record<
  ReactionableType,
  Record<string, Reaction[]>
>;

export type DataStores = {
  settings: Settings;
  deputyDjs: User["userId"][];
  users: User[];
  messages: ChatMessage[];
  typing: User[];
  meta: any;
  artwork: string | null;
  fetching: boolean;
  playlist: PlaylistTrack[];
  queue: QueuedTrack[];
  reactions: {
    message: {};
    track: {};
  };
  defaultSettings: Settings;
  station?: Station;
  reactionTriggerEvents: TriggerEvent<Reaction>[];
  messageTriggerEvents: TriggerEvent<ChatMessage>[];
  triggerEventHistory: TriggerEventHistory;
};

export type Setter<T> = (data: T) => void;
export type Getter<T> = () => T;

export type Getters = {
  getDefaultSettings: Getter<Settings>;
  getDeputyDjs: Getter<User["userId"][]>;
  getMessages: Getter<ChatMessage[]>;
  getMeta: Getter<any>;
  getPlaylist: Getter<PlaylistTrack[]>;
  getQueue: Getter<QueuedTrack[]>;
  getReactions: Getter<ReactionStore>;
  getSettings: Getter<Settings>;
  getTyping: Getter<User[]>;
  getUsers: Getter<User[]>;
  getFetching: Getter<boolean>;
  getStation: Getter<Station>;
  getReactionTriggerEvents: Getter<TriggerEvent<Reaction>[]>;
  getMessageTriggerEvents: Getter<TriggerEvent<ChatMessage>[]>;
  getTriggerEventHistory: Getter<TriggerEventHistory>;
};
export type Setters = {
  setDeputyDjs: Setter<User["userId"][]>;
  setMessages: Setter<ChatMessage[]>;
  setMeta: Setter<any>;
  setPlaylist: Setter<PlaylistTrack[]>;
  setQueue: Setter<QueuedTrack[]>;
  setReactions: Setter<ReactionStore>;
  setSettings: Setter<Settings>;
  setTyping: Setter<User[]>;
  setUsers: Setter<User[]>;
  setFetching: Setter<boolean>;
  setPassword: (pw: string) => string | null;
  setStation: Setter<Station>;
  setReactionTriggerEvents: Setter<TriggerEvent<Reaction>[]>;
  setMessageTriggerEvents: Setter<TriggerEvent<ChatMessage>[]>;
  setTriggerEventHistory: Setter<TriggerEventHistory>;
};

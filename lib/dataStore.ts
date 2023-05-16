import {
  DataStores,
  Getter,
  Getters,
  ReactionStore,
  Setter,
  Setters,
} from "types/DataStores";
import { Station } from "types/Station";
import { ChatMessage } from "../types/ChatMessage";
import { PlaylistTrack } from "../types/PlaylistTrack";
import { QueuedTrack } from "../types/QueuedTrack";
import { Settings } from "../types/Settings";
import { User } from "../types/User";
import { TriggerEvent, TriggerEventHistory } from "types/Triggers";

import defaultState from "../config/defaultState";
import { Reaction, ReactionPayload } from "types/Reaction";

const initialState: DataStores = defaultState;

export const dataStores: DataStores = { ...initialState };

export function resetDataStores() {
  let t: keyof DataStores;
  for (t in dataStores) {
    dataStores[t] = initialState[t];
  }
}

export function createGetter<T>(
  dataStores: DataStores,
  key: keyof DataStores
): Getter<T> {
  return (): T => {
    return dataStores[key];
  };
}

export function createGetters(dataStores: DataStores): Getters {
  return {
    getArtwork: createGetter<string>(dataStores, "artwork"),
    getDefaultSettings: createGetter<Settings>(dataStores, "defaultSettings"),
    getDeputyDjs: createGetter<User["userId"][]>(dataStores, "deputyDjs"),
    getMessages: createGetter<ChatMessage[]>(dataStores, "messages"),
    getMeta: createGetter<any>(dataStores, "meta"),
    getPlaylist: createGetter<PlaylistTrack[]>(dataStores, "playlist"),
    getQueue: createGetter<QueuedTrack[]>(dataStores, "queue"),
    getReactions: createGetter<ReactionStore>(dataStores, "reactions"),
    getSettings: createGetter<Settings>(dataStores, "settings"),
    getTyping: createGetter<User[]>(dataStores, "typing"),
    getUsers: createGetter<User[]>(dataStores, "users"),
    getFetching: createGetter<boolean>(dataStores, "fetching"),
    getStation: createGetter<Station>(dataStores, "station"),
    getReactionTriggerEvents: createGetter<TriggerEvent<Reaction>[]>(
      dataStores,
      "reactionTriggerEvents"
    ),
    getMessageTriggerEvents: createGetter<
      TriggerEvent<ChatMessage | ReactionPayload>[]
    >(dataStores, "messageTriggerEvents"),
    getTriggerEventHistory: createGetter<TriggerEventHistory>(
      dataStores,
      "triggerEventHistory"
    ),
  };
}

export function createSetter<T>(
  dataStores: DataStores,
  key: keyof DataStores
): Setter<T> {
  return (data: T) => {
    dataStores[key] = data;
    return dataStores[key];
  };
}

export function createSetters(dataStores: DataStores): Setters {
  return {
    setDeputyDjs: createSetter<User["userId"][]>(dataStores, "deputyDjs"),
    setMessages: createSetter<ChatMessage[]>(dataStores, "messages"),
    setMeta: createSetter<any>(dataStores, "meta"),
    setPlaylist: createSetter<PlaylistTrack[]>(dataStores, "playlist"),
    setQueue: createSetter<QueuedTrack[]>(dataStores, "queue"),
    setReactions: createSetter<ReactionStore>(dataStores, "reactions"),
    setSettings: createSetter<Settings>(dataStores, "settings"),
    setTyping: createSetter<User[]>(dataStores, "typing"),
    setUsers: createSetter<User[]>(dataStores, "users"),
    setFetching: createSetter<boolean>(dataStores, "fetching"),
    setPassword: (pw: string) => setPassword(dataStores, pw),
    setStation: createSetter<Station>(dataStores, "station"),
    setReactionTriggerEvents: createSetter<TriggerEvent<Reaction>[]>(
      dataStores,
      "reactionTriggerEvents"
    ),
    setMessageTriggerEvents: createSetter<TriggerEvent<ChatMessage>[]>(
      dataStores,
      "messageTriggerEvents"
    ),
    setTriggerEventHistory: createSetter<TriggerEventHistory>(
      dataStores,
      "triggerEventHistory"
    ),
  };
}

const setPassword = (dataStores: DataStores, pw: string) => {
  if (pw === "") {
    dataStores.settings.password = null;
    return null;
  } else {
    dataStores.settings.password = pw;
    return pw;
  }
};

export const getters = createGetters(dataStores);
export const setters = createSetters(dataStores);

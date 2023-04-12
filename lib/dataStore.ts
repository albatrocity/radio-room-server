import { User } from "../types/User";
import { ChatMessage } from "../types/ChatMessage";
import { PlaylistTrack } from "../types/PlaylistTrack";
import { QueuedTrack } from "../types/QueuedTrack";
import { Settings } from "../types/Settings";
import { Station } from "types/Station";
import {
  DataStores,
  Setter,
  Getter,
  Setters,
  Getters,
  ReactionStore,
} from "types/DataStores";

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
    getCover: createGetter<string>(dataStores, "cover"),
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
    setCover: createSetter<string | null>(dataStores, "cover"),
    setFetching: createSetter<boolean>(dataStores, "fetching"),
    setPassword: (pw: string) => setPassword(dataStores, pw),
    setStation: createSetter<Station>(dataStores, "station"),
  };
}

const setPassword = (dataStores: DataStores, pw: string) => {
  if (pw === "") {
    console.log("clear password?");
    dataStores.settings.password = null;
    return null;
  } else {
    console.log("else set it", pw);
    dataStores.settings.password = pw;
    return pw;
  }
};

import { ChatMessage } from "./ChatMessage";
import { PlaylistTrack } from "./PlaylistTrack";
import { QueuedTrack } from "./QueuedTrack";
import { Settings } from "./Settings";
import { Station } from "./Station";
import { User } from "./User";

export type DataStores = {
  settings: Settings;
  deputyDjs: User["userId"][];
  users: User[];
  messages: ChatMessage[];
  typing: User[];
  meta: any;
  cover: string | null;
  fetching: boolean;
  playlist: PlaylistTrack[];
  queue: QueuedTrack[];
  reactions: {
    message: {};
    track: {};
  };
  defaultSettings: Settings;
  station?: Station;
};

export type Setter<T> = (data: T) => void;
export type Getter<T> = () => T;

import { SpotifyTrack } from "./SpotifyTrack";
import { User } from "./User";

export type Room = {
  id: string;
  creator: string;
  type: "jukebox" | "radio";
  title: string;
  fetchMeta: boolean;
  extraInfo: string | undefined;
  password: string | null;
  artwork?: string;
  enableSpotifyLogin: boolean;
  deputizeOnJoin: boolean;
  radioUrl?: string;
  createdAt: string;
};

type Bool = "true" | "false";
export interface StoredRoom
  extends Omit<Room, "fetchMeta" | "enableSpotifyLogin" | "deputizeOnJoin"> {
  fetchMeta: Bool;
  enableSpotifyLogin: Bool;
  deputizeOnJoin: Bool;
}

export type RoomMeta = {
  release?: SpotifyTrack;
  track?: string;
  artist?: string;
  album?: string;
  title?: string;
  bitrate?: number;
  dj?: User;
};
export interface StoredRoomMeta extends Omit<StoredRoom, "release"> {
  release?: string;
}

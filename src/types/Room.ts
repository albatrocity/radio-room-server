import { SpotifyTrack } from "./SpotifyTrack";
import { User } from "./User";

export type RoomError = {
  status: number;
  message: string;
};

export type Room = {
  id: string;
  creator: string;
  type: "jukebox" | "radio";
  title: string;
  fetchMeta: boolean;
  extraInfo: string | undefined;
  password: string | null;
  passwordRequired?: boolean;
  artwork?: string;
  enableSpotifyLogin: boolean;
  deputizeOnJoin: boolean;
  radioUrl?: string;
  createdAt: string;
  spotifyError?: RoomError;
  lastRefreshedAt: string;
};

type Bool = "true" | "false";
export interface StoredRoom
  extends Omit<
    Room,
    "fetchMeta" | "enableSpotifyLogin" | "deputizeOnJoin" | "spotifyError"
  > {
  fetchMeta: Bool;
  enableSpotifyLogin: Bool;
  deputizeOnJoin: Bool;
  spotifyError?: string;
}

export type RoomMeta = {
  release?: SpotifyTrack;
  track?: string;
  artist?: string;
  album?: string;
  title?: string;
  bitrate?: number;
  dj?: User;
  lastUpdatedAt?: string;
};
export interface StoredRoomMeta extends Omit<RoomMeta, "release" | "dj"> {
  release?: string;
  dj?: string;
}

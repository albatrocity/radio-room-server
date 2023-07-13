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
  artwork?: string;
  enableSpotifyLogin: boolean;
  deputizeOnJoin: boolean;
  radioUrl?: string;
  createdAt: string;
  spotifyError?: RoomError;
  lastUpdated?: string;
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
};
export interface StoredRoomMeta extends Omit<RoomMeta, "release" | "dj"> {
  release?: string;
  dj?: string;
}

import { SpotifyTrack } from "./SpotifyTrack";
import { User } from "./User";
import { Station } from "./Station";
import { StationProtocol } from "./StationProtocol";

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
  radioProtocol?: StationProtocol;
  createdAt: string;
  spotifyError?: RoomError;
  radioError?: RoomError;
  lastRefreshedAt: string;
};

type Bool = "true" | "false";
export interface StoredRoom
  extends Omit<
    Room,
    | "fetchMeta"
    | "enableSpotifyLogin"
    | "deputizeOnJoin"
    | "spotifyError"
    | "radioError"
  > {
  fetchMeta: Bool;
  enableSpotifyLogin: Bool;
  deputizeOnJoin: Bool;
  spotifyError?: string;
  radioError?: string;
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
  stationMeta?: Station;
};
export interface StoredRoomMeta
  extends Omit<RoomMeta, "stationMeta" | "release" | "dj"> {
  stationMeta: string;
  dj?: string;
  release?: string;
}

export type RoomSnapshot = {
  id: string;
  lastMessageTime: number;
  lastPlaylistItemTime: number;
};

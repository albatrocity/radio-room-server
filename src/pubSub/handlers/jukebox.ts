import { Server } from "socket.io";
import {
  PUBSUB_JUKEBOX_NOW_PLAYING_FETCHED,
  PUBSUB_PLAYLIST_ADDED,
} from "../../lib/constants";
import { pubClient, subClient } from "../../lib/redisClients";
import getRoomPath from "../../lib/getRoomPath";
import { SpotifyTrack } from "../../types/SpotifyTrack";
import { makeJukeboxCurrentPayload } from "../../operations/data";
import { PlaylistTrack } from "../../types/PlaylistTrack";
import { PubSubHandlerArgs } from "../../types/PubSub";

export default async function bindHandlers(io: Server) {
  subClient.pSubscribe(PUBSUB_JUKEBOX_NOW_PLAYING_FETCHED, (message, channel) =>
    handleNowPlaying({ io, message, channel })
  );
  subClient.pSubscribe(PUBSUB_PLAYLIST_ADDED, (message, channel) =>
    handlePlaylistAdded({ io, message, channel })
  );
}

async function handleNowPlaying({ io, message, channel }: PubSubHandlerArgs) {
  const { roomId, nowPlaying }: { nowPlaying: SpotifyTrack; roomId: string } =
    JSON.parse(message);
  const payload = await makeJukeboxCurrentPayload(roomId, nowPlaying);
  io.to(getRoomPath(roomId)).emit("event", payload);
}

async function handlePlaylistAdded({
  io,
  message,
  channel,
}: PubSubHandlerArgs) {
  const { roomId, track }: { track: PlaylistTrack; roomId: string } =
    JSON.parse(message);
  io.to(getRoomPath(roomId)).emit("event", {
    type: "PLAYLIST_TRACK_ADDED",
    data: { track },
  });
}

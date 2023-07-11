import { Server } from "socket.io";
import { PUBSUB_JUKEBOX_NOW_PLAYING_FETCHED } from "../../lib/constants";
import { pubClient, subClient } from "../../lib/redisClients";
import getRoomPath from "../../lib/getRoomPath";
import { SpotifyTrack } from "../../types/SpotifyTrack";
import { makeJukeboxCurrentPayload } from "../../operations/data";

export default async function bindHandlers(io: Server) {
  subClient.pSubscribe(PUBSUB_JUKEBOX_NOW_PLAYING_FETCHED, (message, channel) =>
    handleNowPlaying({ io, message, channel })
  );
}

type HandlerArgs = {
  io: Server;
  message: string;
  channel: string;
};

async function handleNowPlaying({ io, message, channel }: HandlerArgs) {
  const { roomId, nowPlaying }: { nowPlaying: SpotifyTrack; roomId: string } =
    JSON.parse(message);
  const payload = await makeJukeboxCurrentPayload(roomId, nowPlaying);
  io.to(getRoomPath(roomId)).emit("event", payload);
}

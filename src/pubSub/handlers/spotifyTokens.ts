import { Server } from "socket.io";

import { PUBSUB_USER_SPOTIFY_ACCESS_TOKEN_REFRESHED } from "../../lib/constants";
import { getUser } from "../../operations/data";
import { subClient } from "../../lib/redisClients";
import { PubSubHandlerArgs } from "../../types/PubSub";

export default async function bindHandlers(io: Server) {
  subClient.pSubscribe(
    PUBSUB_USER_SPOTIFY_ACCESS_TOKEN_REFRESHED,
    (message, channel) =>
      handleUserSpotifyTokenRefreshed({ io, message, channel })
  );
}

async function handleUserSpotifyTokenRefreshed({
  io,
  message,
  channel,
}: PubSubHandlerArgs) {
  const { userId, accessToken }: { userId: string; accessToken: string } =
    JSON.parse(message);
  const user = await getUser(userId);
  if (!user?.id) {
    return;
  }

  io.to(user.id).emit("event", {
    type: "SPOTIFY_ACCESS_TOKEN_REFRESHED",
    data: { accessToken },
  });
}

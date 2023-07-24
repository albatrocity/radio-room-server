import { Server } from "socket.io";
import { subClient } from "../../lib/redisClients";
import {
  PUBSUB_ROOM_DELETED,
  PUBSUB_SPOTIFY_PLAYBACK_STATE_CHANGED,
} from "../../lib/constants";
import { PubSubHandlerArgs } from "../../types/PubSub";
import getRoomPath from "../../lib/getRoomPath";
import systemMessage from "../../lib/systemMessage";
import sendMessage from "../../lib/sendMessage";

export default async function bindHandlers(io: Server) {
  subClient.pSubscribe(PUBSUB_ROOM_DELETED, (message, channel) =>
    handleRoomDeleted({ io, message, channel })
  );

  subClient.pSubscribe(
    PUBSUB_SPOTIFY_PLAYBACK_STATE_CHANGED,
    (message, channel) => {
      handlePlaybackStateChange({ io, message, channel });
    }
  );
}

async function handleRoomDeleted({ io, message, channel }: PubSubHandlerArgs) {
  const roomId = message;
  io.to(getRoomPath(roomId)).emit("event", {
    type: "ROOM_DELETED",
    data: {
      roomId,
    },
  });
}

export function handlePlaybackStateChange({ io, message }: PubSubHandlerArgs) {
  const { isPlaying, roomId } = JSON.parse(message);
  const newMessage = systemMessage(
    `Server playback has been ${isPlaying ? "resumed" : "paused"}`,
    {
      type: "alert",
    }
  );
  sendMessage(io, roomId, newMessage);
}

import { Server } from "socket.io";
import { subClient } from "../../lib/redisClients";
import { PUBSUB_ROOM_DELETED } from "../../lib/constants";
import { PubSubHandlerArgs } from "../../types/PubSub";
import getRoomPath from "../../lib/getRoomPath";

export default async function bindHandlers(io: Server) {
  subClient.pSubscribe(PUBSUB_ROOM_DELETED, (message, channel) =>
    handleRoomDeleted({ io, message, channel })
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

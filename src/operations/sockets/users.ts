import getRoomPath from "../../lib/getRoomPath";
import { HandlerConnections } from "../../types/HandlerConnections";
import { Room } from "../../types/Room";
import { User } from "../../types/User";

type UsersData = {
  users: User[];
  user?: User;
};

export async function pubUserJoined(
  { io }: Pick<HandlerConnections, "io">,
  roomId: Room["id"],
  data: UsersData
) {
  io.to(getRoomPath(roomId)).emit("event", {
    type: "USER_JOINED",
    data: data,
  });
}

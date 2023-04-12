import { Socket } from "socket.io";

export interface RadioSocket extends Socket {
  username: string;
  userId: string;
}

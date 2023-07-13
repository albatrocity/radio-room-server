import { Server, Socket } from "socket.io";
import { User } from "../types/User";

import {
  changeUsername,
  checkPassword,
  disconnect,
  login,
  getUserSpotifyAuth,
  submitPassword,
  logoutSpotifyAuth,
} from "../handlers/authHandlers";

export default function authController(socket: Socket, io: Server) {
  socket.on("check password", (submittedPassword: string) =>
    checkPassword({ socket, io }, submittedPassword)
  );

  socket.on("submit password", (submittedPassword: string) =>
    submitPassword({ socket, io }, submittedPassword)
  );

  socket.on(
    "login",
    ({
      username,
      userId,
      password,
      roomId,
    }: {
      username: User["username"];
      userId: User["userId"];
      password?: string;
      roomId: string;
    }) => {
      login({ socket, io }, { username, userId, password, roomId });
    }
  );

  socket.on(
    "change username",
    ({
      username,
      userId,
    }: {
      username: User["username"];
      userId: User["userId"];
    }) => changeUsername({ socket, io }, { username, userId })
  );

  socket.on("get user spotify authentication status", ({ userId }) => {
    getUserSpotifyAuth({ socket, io }, { userId });
  });
  socket.on("logout spotify", (args: { userId?: string } = {}) => {
    const options = args ? { userId: args.userId } : { userId: "app" };
    logoutSpotifyAuth({ socket, io }, options);
  });

  socket.on("disconnect", () => disconnect({ socket, io }));
}

import { Server, Socket } from "socket.io";
import { User } from "../types/User";

import {
  changeUsername,
  checkPassword,
  disconnect,
  login,
  submitPassword,
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
    }: {
      username: User["username"];
      userId: User["userId"];
      password?: string;
    }) => {
      console.log("LOGIN!!!!");
      login({ socket, io }, { username, userId, password });
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

  socket.on("disconnect", () => disconnect({ socket, io }));
}

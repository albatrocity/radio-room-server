import systemMessage from "../lib/systemMessage";
import sendMessage from "../lib/sendMessage";

import { reject, find, concat, uniqBy, isNil, get } from "lodash/fp";
import { Server, Socket } from "socket.io";
import { Setters, Getters } from "types/DataStores";
import { User } from "types/User";

function authHandlers(
  socket: Socket,
  io: Server,
  {
    getUsers,
    getMessages,
    getPlaylist,
    getReactions,
    getSettings,
    getDeputyDjs,
    getCover,
    getMeta,
    getDefaultSettings,
  }: Getters,
  { setUsers, setMessages, setSettings }: Setters
) {
  const settings = getSettings();
  socket.on("check password", (submittedPassword) => {
    socket.emit("event", {
      type: "SET_PASSWORD_REQUIREMENT",
      data: {
        passwordRequired: !isNil(settings.password),
        passwordAccepted: settings.password
          ? submittedPassword === settings.password
          : true,
      },
    });
  });

  socket.on("submit password", (submittedPassword) => {
    socket.emit("event", {
      type: "SET_PASSWORD_ACCEPTED",
      data: {
        passwordAccepted: settings.password === submittedPassword,
      },
    });
  });

  // login
  socket.on("login", ({ username, userId, password }) => {
    const users = getUsers();
    socket.data.username = username;
    socket.data.userId = userId;

    const isDeputyDj = getDeputyDjs().includes(userId);

    const newUser = {
      username,
      userId,
      id: socket.id,
      isDj: false,
      isDeputyDj,
      status: "participating" as const,
      connectedAt: new Date().toISOString(),
    };
    const newUsers = uniqBy("userId", users.concat(newUser));
    setUsers(newUsers);

    socket.broadcast.emit("event", {
      type: "USER_JOINED",
      data: {
        user: newUser,
        users: newUsers,
      },
    });

    socket.emit("event", {
      type: "INIT",
      data: {
        users: newUsers,
        messages: getMessages(),
        meta: getCover() ? { ...getMeta(), cover: getCover() } : getMeta(),
        playlist: getPlaylist(),
        reactions: getReactions(),
        currentUser: {
          userId: socket.data.userId,
          username: socket.data.username,
          status: "participating",
          isDeputyDj,
        },
      },
    });
  });

  socket.on("change username", ({ userId, username }) => {
    const users = getUsers();
    const user = find({ userId }, users);
    const oldUsername = get("username", user);
    if (user) {
      const newUser: User = { ...user, username };
      const newUsers = uniqBy(
        "userId",
        concat(newUser, reject({ userId }, users))
      );
      setUsers(newUsers);

      const content = `${oldUsername} transformed into ${username}`;
      const newMessage = systemMessage(content, {
        oldUsername,
        userId,
      });
      io.emit("event", {
        type: "USER_JOINED",
        data: {
          user: newUser,
          users: newUsers,
        },
      });
      sendMessage(io, newMessage, { getMessages, setMessages });
    }
  });

  socket.on("disconnect", () => {
    const users = getUsers();
    const user = find({ userId: socket.data.userId }, users);
    if (user && user.isDj) {
      const newSettings = { ...getDefaultSettings() };
      setSettings(newSettings);
      io.emit("event", { type: "SETTINGS", data: newSettings });
    }

    const newUsers = reject({ userId: socket.data.userId }, users);
    setUsers(newUsers);

    socket.broadcast.emit("event", {
      type: "USER_LEFT",
      data: {
        user: { username: socket.data.username },
        users: newUsers,
      },
    });
  });
}

export default authHandlers;

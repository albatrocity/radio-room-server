import sendMessage from "../lib/sendMessage";
import systemMessage from "../lib/systemMessage";

import { concat, find, get, isNil, reject, uniqBy } from "lodash/fp";
import { getters, setters } from "../lib/dataStore";
import { HandlerConnections } from "../types/HandlerConnections";
import { User } from "../types/User";

const {
  getSettings,
  getUsers,
  getDeputyDjs,
  getMessages,
  getCover,
  getPlaylist,
  getReactions,
  getMeta,
  getDefaultSettings,
} = getters;
const { setUsers, setMessages, setSettings } = setters;

export function checkPassword(
  { socket, io }: HandlerConnections,
  submittedPassword: string
) {
  const settings = getSettings();
  console.log("CHECK PASSWORD!!!!");
  socket.emit("event", {
    type: "SET_PASSWORD_REQUIREMENT",
    data: {
      passwordRequired: !isNil(settings.password),
      passwordAccepted: settings.password
        ? submittedPassword === settings.password
        : true,
    },
  });
}

export function submitPassword(
  { socket, io }: HandlerConnections,
  submittedPassword: string
) {
  const settings = getSettings();
  socket.emit("event", {
    type: "SET_PASSWORD_ACCEPTED",
    data: {
      passwordAccepted: settings.password === submittedPassword,
    },
  });
}

export function login(
  { socket, io }: HandlerConnections,
  {
    username,
    userId,
    password,
  }: { username: User["username"]; userId: User["userId"]; password?: string }
) {
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
}

export function changeUsername(
  { socket, io }: HandlerConnections,
  { userId, username }: { userId: User["userId"]; username: User["username"] }
) {
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
    sendMessage(io, newMessage);
  }
}

export function disconnect({ socket, io }: HandlerConnections) {
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
}

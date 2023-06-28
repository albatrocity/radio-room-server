import sendMessage from "../lib/sendMessage";
import systemMessage from "../lib/systemMessage";

import { isNil, uniqBy } from "remeda";
import { reject } from "remeda";
import { getters, setters } from "../lib/dataStore";
import { HandlerConnections } from "../types/HandlerConnections";
import { User } from "../types/User";
import { events } from "../lib/eventEmitter";
import getStoredUserSpotifyTokens from "../operations/spotify/getStoredUserSpotifyTokens";

export function checkPassword(
  { socket, io }: HandlerConnections,
  submittedPassword: string
) {
  const settings = getters.getSettings();
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
  const settings = getters.getSettings();
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
  const users = getters.getUsers();

  socket.data.username = username;
  socket.data.userId = userId;

  const isDeputyDj = getters.getDeputyDjs().includes(userId);

  const newUser = {
    username,
    userId,
    id: socket.id,
    isDj: false,
    isDeputyDj,
    status: "participating" as const,
    connectedAt: new Date().toISOString(),
  };
  const newUsers = uniqBy([...users, newUser], (u) => u.userId);
  setters.setUsers(newUsers);

  socket.broadcast.emit("event", {
    type: "USER_JOINED",
    data: {
      user: newUser,
      users: newUsers,
    },
  });

  events.emit("USER_JOINED", {
    user: newUser,
    users: newUsers,
  });

  socket.emit("event", {
    type: "INIT",
    data: {
      users: newUsers,
      messages: getters.getMessages(),
      meta: getters.getSettings().artwork
        ? { ...getters.getMeta(), artwork: getters.getSettings().artwork }
        : getters.getMeta(),
      playlist: getters.getPlaylist(),
      reactions: getters.getReactions(),
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
  const users = getters.getUsers();
  const user = users.find((u) => u.userId === userId);
  const oldUsername = user?.username;
  if (user) {
    const newUser: User = { ...user, username };
    const newUsers = uniqBy(
      [newUser, ...reject(users, (u) => u.userId === userId)],
      (u) => u.userId
    );

    setters.setUsers(newUsers);

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
  const users = getters.getUsers();
  const user = users.find((u) => u.userId === socket.data.userId);
  if (user && user.isDj) {
    const newSettings = { ...getters.getDefaultSettings() };
    setters.setSettings(newSettings);
    io.emit("event", { type: "SETTINGS", data: newSettings });
  }

  const newUsers = reject(users, (u) => u.userId === socket.data.userId);
  setters.setUsers(newUsers);

  socket.broadcast.emit("event", {
    type: "USER_LEFT",
    data: {
      user: { username: socket.data.username },
      users: newUsers,
    },
  });
}

export async function getUserShopifyAuth(
  { socket, io }: HandlerConnections,
  { userId }: { userId?: string }
) {
  // get user's spotify access token from redis
  const { accessToken } = await getStoredUserSpotifyTokens(
    userId ?? socket.data.userId
  );
  io.to(socket.id).emit("event", {
    type: "SPOTIFY_AUTHENTICATION_STATUS",
    data: {
      isAuthenticated: !!accessToken,
    },
  });
}

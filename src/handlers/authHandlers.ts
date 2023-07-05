import sendMessage from "../lib/sendMessage";
import systemMessage from "../lib/systemMessage";

import { isNil, uniqBy } from "remeda";
import { reject } from "remeda";
import { getters, setters } from "../lib/dataStore";
import { HandlerConnections } from "../types/HandlerConnections";
import { User } from "../types/User";
import { events } from "../lib/eventEmitter";
import getStoredUserSpotifyTokens from "../operations/spotify/getStoredUserSpotifyTokens";
import removeStoredUserSpotifyTokens from "../operations/spotify/removeStoredUserSpotifyTokens";
import getRoomPath from "../lib/getRoomPath";

export function checkPassword(
  { socket, io }: HandlerConnections,
  submittedPassword: string
) {
  const settings = getters.getSettings();
  socket.to(getRoomPath(socket.data.roomId)).emit("event", {
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
  socket.to(getRoomPath(socket.data.roomId)).emit("event", {
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
    roomId,
  }: {
    username: User["username"];
    userId: User["userId"];
    password?: string;
    roomId?: string;
  }
) {
  const users = getters.getUsers();
  console.log(`joining ${getRoomPath(roomId)}`);
  socket.join(getRoomPath(roomId));
  console.log("ROOM ID", roomId);

  socket.data.username = username;
  socket.data.userId = userId;
  socket.data.roomId = roomId;

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

  socket.broadcast.to(getRoomPath(roomId)).emit("event", {
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
    io.to(getRoomPath(socket.data.roomId)).emit("event", {
      type: "USER_JOINED",
      data: {
        user: newUser,
        users: newUsers,
      },
    });
    sendMessage(io, newMessage, socket.data.roomId);
  }
}

export function disconnect({ socket, io }: HandlerConnections) {
  const users = getters.getUsers();
  const user = users.find((u) => u.userId === socket.data.userId);
  if (user && user.isDj) {
    const newSettings = { ...getters.getDefaultSettings() };
    setters.setSettings(newSettings);
    io.to(getRoomPath(socket.data.roomId)).emit("event", {
      type: "SETTINGS",
      data: newSettings,
    });
  }

  const newUsers = reject(users, (u) => u.userId === socket.data.userId);
  setters.setUsers(newUsers);

  socket.broadcast.to(getRoomPath(socket.data.roomId)).emit("event", {
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

export async function logoutSpotifyAuth(
  { socket, io }: HandlerConnections,
  { userId }: { userId?: string } = {}
) {
  // removes user's spotify access token from redis
  const { error } = await removeStoredUserSpotifyTokens(
    userId ?? socket.data.userId
  );
  io.to(socket.id).emit("event", {
    type: "SPOTIFY_AUTHENTICATION_STATUS",
    data: {
      isAuthenticated: error ? true : false,
    },
  });
}

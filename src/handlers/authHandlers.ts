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
import {
  addOnlineUser,
  deleteUser,
  getAllRoomReactions,
  getMessages,
  getRoomUsers,
  getUser,
  isDj,
  persistUser,
  removeOnlineUser,
} from "../operations/data";
import updateUserAttributes from "../lib/updateUserAttributes";
import { pubUserJoined } from "../operations/sockets/users";

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

export async function login(
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
    roomId: string;
  }
) {
  console.log("login", username, userId, password, roomId);
  const users = await getRoomUsers(roomId);
  console.log(`joining ${getRoomPath(roomId)}`);
  socket.join(getRoomPath(roomId));

  socket.data.username = username;
  socket.data.userId = userId;
  socket.data.roomId = roomId;

  const isDeputyDj = await isDj(roomId, userId);

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
  await addOnlineUser(roomId, userId);
  await persistUser(userId, newUser);

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

  const messages = await getMessages(roomId, 0, 100);

  const allReactions = await getAllRoomReactions(roomId);
  console.log("allReactions", allReactions);

  socket.emit("event", {
    type: "INIT",
    data: {
      users: newUsers,
      messages,
      meta: getters.getSettings().artwork
        ? { ...getters.getMeta(), artwork: getters.getSettings().artwork }
        : getters.getMeta(),
      playlist: getters.getPlaylist(),
      reactions: allReactions,
      currentUser: {
        userId: socket.data.userId,
        username: socket.data.username,
        status: "participating",
        isDeputyDj,
      },
    },
  });
}

export async function changeUsername(
  { socket, io }: HandlerConnections,
  { userId, username }: { userId: User["userId"]; username: User["username"] }
) {
  const user = await getUser(userId);
  const oldUsername = user?.username;
  if (user) {
    const { users: newUsers, user: newUser } = await updateUserAttributes(
      userId,
      { username },
      socket.data.roomId
    );

    const content = `${oldUsername} transformed into ${username}`;
    pubUserJoined({ io }, socket.data.roomId, {
      users: newUsers,
      user: newUser,
    });
    sendMessage(
      io,
      systemMessage(content, {
        oldUsername,
        userId,
      }),
      socket.data.roomId
    );
  }
}

export async function disconnect({ socket, io }: HandlerConnections) {
  const user = await getUser(socket.data.userId);
  if (user?.isDj) {
    const newSettings = { ...getters.getDefaultSettings() };
    setters.setSettings(newSettings);
    io.to(getRoomPath(socket.data.roomId)).emit("event", {
      type: "SETTINGS",
      data: newSettings,
    });
  }

  await removeOnlineUser(socket.data.roomId, socket.data.userId);
  await deleteUser(socket.data.userId);

  const users = await getRoomUsers(socket.data.roomId);

  socket.broadcast.to(getRoomPath(socket.data.roomId)).emit("event", {
    type: "USER_LEFT",
    data: {
      user: { username: socket.data.username },
      users,
    },
  });
}

export async function getUserSpotifyAuth(
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

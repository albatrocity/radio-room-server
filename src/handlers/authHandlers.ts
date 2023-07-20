import sendMessage from "../lib/sendMessage";
import systemMessage from "../lib/systemMessage";
import { find, isNil, uniqBy } from "remeda";
import { HandlerConnections } from "../types/HandlerConnections";
import { User } from "../types/User";
import { events } from "../lib/eventEmitter";
import getStoredUserSpotifyTokens from "../operations/spotify/getStoredUserSpotifyTokens";
import removeStoredUserSpotifyTokens from "../operations/spotify/removeStoredUserSpotifyTokens";
import getRoomPath from "../lib/getRoomPath";
import {
  addOnlineUser,
  deleteUser,
  findRoom,
  getAllRoomReactions,
  getMessages,
  getRoomUsers,
  getUser,
  isDj,
  persistUser,
  removeOnlineUser,
  getRoomPlaylist,
  getRoomCurrent,
  updateUserAttributes,
  persistRoom,
  getUserRooms,
} from "../operations/data";
import { pubUserJoined } from "../operations/sockets/users";
import { Room } from "../types/Room";

function passwordMatched(
  room: Room | null,
  password?: string,
  userId?: string
) {
  if (userId === room?.creator) {
    return true;
  }
  return !room?.password || room?.password === password;
}

export async function checkPassword(
  { socket, io }: HandlerConnections,
  submittedPassword: string
) {
  const room = await findRoom(socket.data.roomId);

  socket.emit("event", {
    type: "SET_PASSWORD_REQUIREMENT",
    data: {
      passwordRequired: !isNil(room?.password),
      passwordAccepted: room?.password
        ? submittedPassword === room?.password
        : true,
    },
  });
}

export async function submitPassword(
  { socket, io }: HandlerConnections,
  submittedPassword: string
) {
  const room = await findRoom(socket.data.roomId);
  if (!room) {
    socket.emit("event", {
      type: "ERROR",
      data: {
        message: "Room not found",
        status: 404,
      },
    });
    return;
  }

  socket.emit("event", {
    type: "SET_PASSWORD_ACCEPTED",
    data: {
      passwordAccepted: passwordMatched(
        room,
        submittedPassword,
        socket.data.userId
      ),
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
  if (!roomId || !socket.id || !userId) {
    return;
  }
  const users = await getRoomUsers(roomId);
  socket.join(getRoomPath(roomId));

  socket.data.username = username;
  socket.data.userId = userId;
  socket.data.roomId = roomId;
  socket.request.session.roomId = roomId;
  socket.request.session.user = {
    userId,
    username,
  };

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
  const room = await findRoom(roomId);

  if (!room) {
    socket.emit("event", {
      type: "ERROR",
      data: {
        message: "Room not found",
        status: 404,
      },
    });
    return;
  }

  const isAdmin = room?.creator === socket.data.userId;

  if (!passwordMatched(room, password, userId)) {
    socket.emit("event", {
      type: "UNAUTHORIZED",
      data: {
        message: "Password is incorrect",
        status: 401,
      },
    });
    return;
  }

  const newUsers = uniqBy([...users, newUser], (u) => u.userId);
  await addOnlineUser(roomId, userId);
  await persistUser(userId, newUser);

  // If the admin has logged in, remove expiration of room keys
  if (isAdmin) {
    await persistRoom(roomId);
  }

  pubUserJoined({ io }, socket.data.roomId, { user: newUser, users: newUsers });

  events.emit("USER_JOINED", {
    user: newUser,
    users: newUsers,
  });

  const messages = await getMessages(roomId, 0, 100);
  const playlist = await getRoomPlaylist(roomId);
  const meta = await getRoomCurrent(roomId);
  const allReactions = await getAllRoomReactions(roomId);
  const { accessToken } = await getStoredUserSpotifyTokens(userId);

  socket.emit("event", {
    type: "INIT",
    data: {
      users: newUsers,
      messages,
      meta,
      passwordRequired: !isNil(room?.password),
      playlist: playlist,
      reactions: allReactions,
      currentUser: {
        userId: socket.data.userId,
        username: socket.data.username,
        status: "participating",
        isDeputyDj,
        isAdmin,
      },
      accessToken,
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

    socket.request.session.user = newUser;

    const content = `${oldUsername} transformed into ${username}`;
    pubUserJoined({ io }, socket.data.roomId, {
      users: newUsers,
      user: newUser,
    });
    sendMessage(
      io,
      socket.data.roomId,
      systemMessage(content, {
        oldUsername,
        userId,
      })
    );
  }
}

export async function disconnect({ socket, io }: HandlerConnections) {
  await removeOnlineUser(socket.data.roomId, socket.data.userId);
  socket.leave(getRoomPath(socket.data.roomId));

  const userRooms = await getUserRooms(socket.data.userId);

  if (userRooms.length === 0) {
    await deleteUser(socket.data.userId);
  }

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
      accessToken,
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

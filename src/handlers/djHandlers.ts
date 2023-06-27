import { reject, map, uniqBy } from "remeda";

import { getters, setters } from "../lib/dataStore";
import sendMessage from "../lib/sendMessage";
import globalSpotifyApi from "../lib/spotifyApi";
import systemMessage from "../lib/systemMessage";
import updateUserAttributes from "../lib/updateUserAttributes";
import refreshSpotifyToken from "../operations/spotify/refreshSpotifyToken";
import syncQueue from "../operations/spotify/syncQueue";

import { HandlerConnections } from "../types/HandlerConnections";
import { SearchOptions } from "../types/SpotifyApi";
import { SpotifyEntity } from "../types/SpotifyEntity";
import { User } from "../types/User";
import { Server } from "socket.io";
import getSpotifyApiForUser from "../operations/spotify/getSpotifyApiForUser";
import createAndPopulateSpotifyPlaylist from "../operations/spotify/createAndPopulateSpotifyPlaylist";

export function setDj(
  { io, socket }: HandlerConnections,
  userId?: User["userId"]
) {
  const users = getters.getUsers();
  const user = users.find((u) => u.userId === userId);
  if (user && user.isDj) {
    return;
  }

  if (userId && user) {
    const newUser = { ...user, isDj: true };
    const newUsers = uniqBy(
      [
        ...reject(
          map(users, (x) => ({ ...x, isDj: false })),
          (u) => u.userId === userId
        ),
        newUser,
      ],
      (u) => u.userId
    );
    setters.setUsers(newUsers);
    const content = `${user.username} is now the DJ`;
    const newMessage = systemMessage(content, {
      userId,
    });
    sendMessage(io, newMessage);
    io.emit("event", {
      type: "USER_JOINED",
      data: {
        user: newUser,
        users: newUsers,
      },
    });
  } else {
    const newUsers = uniqBy(
      map(users, (x) => ({ ...x, isDj: false })),
      (u) => u.userId
    );
    setters.setUsers(newUsers);
    const content = `There's currently no DJ.`;
    const newMessage = systemMessage(content, {
      userId,
    });
    sendMessage(io, newMessage);
    io.emit("event", {
      type: "USER_JOINED",
      data: {
        users: newUsers,
      },
    });
  }
}

export function djDeputizeUser({ io }: { io: Server }, userId: User["userId"]) {
  const deputyDjs = getters.getDeputyDjs();
  const socketId = getters.getUsers().find((u) => u.userId === userId)?.id;
  var eventType, message, isDeputyDj;

  if (deputyDjs.includes(userId)) {
    eventType = "END_DEPUTY_DJ_SESSION";
    message = `You are no longer a deputy DJ`;
    isDeputyDj = false;
    setters.setDeputyDjs(deputyDjs.filter((x) => x !== userId));
  } else {
    eventType = "START_DEPUTY_DJ_SESSION";
    message = `You've been promoted to a deputy DJ. You may now add songs to the DJ's queue.`;
    isDeputyDj = true;
    setters.setDeputyDjs([...deputyDjs, userId]);
  }

  const { user, users } = updateUserAttributes(userId, { isDeputyDj });

  io.to(socketId).emit(
    "event",
    {
      type: "NEW_MESSAGE",
      data: systemMessage(message, { type: "alert", status: "info" }),
    },
    { status: "info" }
  );

  io.to(socketId).emit("event", { type: eventType });
  io.emit("event", {
    type: "USER_JOINED",
    data: {
      user,
      users,
    },
  });
}

export async function queueSong(
  { socket, io }: HandlerConnections,
  uri: SpotifyEntity["uri"]
) {
  try {
    const currentUser = getters
      .getUsers()
      .find(({ userId }) => userId === socket.data.userId);
    await syncQueue();
    const inQueue = getters.getQueue().find((x) => x.uri === uri);

    if (inQueue) {
      const djUsername =
        getters.getUsers().find(({ userId }) => userId === inQueue.userId)
          ?.username || "Someone";
      socket.emit("event", {
        type: "SONG_QUEUE_FAILURE",
        data: {
          message:
            inQueue.userId === socket.data.userId
              ? "You've already queued that song, please choose another"
              : `${djUsername} has already queued that song. Please try a different song.`,
        },
      });
      return;
    }
    const data = await globalSpotifyApi.addToQueue(uri);

    setters.setQueue([
      ...getters.getQueue(),
      { uri, userId: socket.data.userId, username: currentUser?.username },
    ]);
    socket.emit("event", {
      type: "SONG_QUEUED",
      data,
    });
    const queueMessage = systemMessage(
      `${
        currentUser ? currentUser.username : "Someone"
      } added a song to the queue`
    );
    sendMessage(io, queueMessage);
  } catch (e) {
    socket.emit("event", {
      type: "SONG_QUEUE_FAILURE",
      data: {
        message: "Song could not be queued",
        error: e,
      },
    });
  }
}

export async function searchSpotifyTrack(
  { socket }: HandlerConnections,
  { query, options }: { query: string; options: SearchOptions }
) {
  const spotifyApi = await getSpotifyApiForUser(socket.data.userId);

  try {
    const data = await spotifyApi.searchTracks(query, options);
    socket.emit("event", {
      type: "TRACK_SEARCH_RESULTS",
      data: data.body.tracks,
    });
  } catch (e) {
    const token = await refreshSpotifyToken(socket.data.userId);
    if (token) {
      spotifyApi.setAccessToken(token);
    }
    socket.emit("event", {
      type: "TRACK_SEARCH_RESULTS_FAILURE",
      data: {
        message:
          "Something went wrong when trying to search for tracks. You might need to log in to Spotify's OAuth",
        error: e,
      },
    });
  }
}

export async function savePlaylist(
  { socket }: HandlerConnections,
  { name, uris }: { name: string; uris: SpotifyEntity["uri"][] }
) {
  try {
    const data = await createAndPopulateSpotifyPlaylist(
      name,
      uris,
      socket.data.userId
    );
    socket.emit("event", { type: "PLAYLIST_SAVED", data });
  } catch (error) {
    socket.emit("event", { type: "SAVE_PLAYLIST_FAILED", error });
  }
}

export async function handleUserJoined(
  { io }: { io: Server },
  { user }: { user: User; users: User[] }
) {
  const deputyDjs = getters.getDeputyDjs();
  if (
    getters.getSettings().deputizeOnJoin &&
    !deputyDjs.includes(user.userId)
  ) {
    djDeputizeUser({ io }, user.userId);
  }
}

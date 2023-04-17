import { concat, find, get, map, reject, uniqBy } from "lodash/fp";

import { getters, setters } from "../lib/dataStore";
import sendMessage from "../lib/sendMessage";
import spotifyApi from "../lib/spotifyApi";
import systemMessage from "../lib/systemMessage";
import updateUserAttributes from "../lib/updateUserAttributes";
import refreshSpotifyToken from "../operations/refreshSpotifyToken";

import { HandlerConnections } from "../types/HandlerConnections";
import { SearchOptions } from "../types/SpotifyApi";
import { SpotifyEntity } from "../types/SpotifyEntity";
import { User } from "../types/User";

const { setUsers, setMessages, setSettings, setDeputyDjs, setQueue } = setters;
const { getUsers, getMessages, getDefaultSettings, getDeputyDjs, getQueue } =
  getters;

export function setDj(
  { io, socket }: HandlerConnections,
  userId: User["userId"]
) {
  const users = getUsers();
  const user = find({ userId }, users);
  if (user && user.isDj) {
    return;
  }
  if (userId && user) {
    const newUser = { ...user, isDj: true };
    const newUsers = uniqBy(
      "userId",
      concat(
        newUser,
        reject(
          { userId },
          map((x) => ({ ...x, isDj: false }), users)
        )
      )
    );
    setUsers(newUsers);
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
      "userId",
      map((x) => ({ ...x, isDj: false }), users)
    );
    setUsers(newUsers);
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
  const newSettings = { ...getDefaultSettings() };
  setSettings(newSettings);
  io.emit("event", { type: "SETTINGS", data: newSettings });
}

export function djDeputizeUser(
  { socket, io }: HandlerConnections,
  userId: User["userId"]
) {
  const deputyDjs = getDeputyDjs();
  const socketId = get("id", find({ userId }, getUsers()));
  var eventType, message, isDeputyDj;

  if (deputyDjs.includes(userId)) {
    eventType = "END_DEPUTY_DJ_SESSION";
    message = `You are no longer a deputy DJ`;
    isDeputyDj = false;
    setDeputyDjs(deputyDjs.filter((x) => x !== userId));
  } else {
    eventType = "START_DEPUTY_DJ_SESSION";
    message = `You've been promoted to a deputy DJ. You add song's to the DJ's queue.`;
    isDeputyDj = true;
    setDeputyDjs([...deputyDjs, userId]);
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
    const currentUser = getUsers().find(
      ({ userId }) => userId === socket.data.userId
    );
    const inQueue = getQueue().find((x) => x.uri === uri);

    if (inQueue) {
      const djUsername =
        getUsers().find(({ userId }) => userId === inQueue.userId)?.username ||
        "Someone";
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

    const data = await spotifyApi.addToQueue(uri);

    setQueue([
      ...getQueue(),
      { uri, userId: socket.data.userId, username: currentUser?.username },
    ]);
    socket.emit("event", {
      type: "SONG_QUEUED",
      data,
    });
    const queueMessage = systemMessage(
      `${currentUser ? currentUser.username : "Someone"
      } added a song to the queue`
    );
    sendMessage(io, queueMessage);
  } catch (e) {
    console.log(e);
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
  { socket, io }: HandlerConnections,
  { query, options }: { query: string; options: SearchOptions }
) {
  try {
    const data = await spotifyApi.searchTracks(query, options);
    socket.emit("event", {
      type: "TRACK_SEARCH_RESULTS",
      data: data.body.tracks,
    });
  } catch (e) {
    const token = await refreshSpotifyToken();
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

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
import getSpotifyApiForUser from "../operations/spotify/getSpotifyApiForUser";
import createAndPopulateSpotifyPlaylist from "../operations/spotify/createAndPopulateSpotifyPlaylist";
import getRoomPath from "../lib/getRoomPath";
import {
  addDj,
  findRoom,
  getDjs,
  getRoomUsers,
  getUser,
  isDj,
  removeDj,
} from "../operations/data";
import { pubUserJoined } from "../operations/sockets/users";

export async function setDj(
  { io, socket }: HandlerConnections,
  userId?: User["userId"]
) {
  if (userId) {
    const foundUser = await getUser(userId);
    // Skip if user is the DJ
    if (foundUser?.isDj) {
      return;
    }

    const { user, users } = await updateUserAttributes(userId, { isDj: true });
    const content = `${user?.username} is now the DJ`;
    const newMessage = systemMessage(content, {
      userId,
    });
    await sendMessage(io, newMessage, socket.data.roomId);
    await pubUserJoined({ io }, socket.data.roomId, { user, users });
  } else {
    const users = await getRoomUsers(socket.data.roomId);
    const dj = users.find((u) => u.isDj);
    if (!dj) {
      return;
    }
    await updateUserAttributes(dj?.userId, { isDj: false });

    const content = `There's currently no DJ.`;
    const newMessage = systemMessage(content, {
      userId,
    });

    await sendMessage(io, newMessage, socket.data.roomId);
    await pubUserJoined({ io }, socket.data.roomId, { users });
  }
}

export async function djDeputizeUser(
  { io, socket }: HandlerConnections,
  userId: User["userId"]
) {
  const storedUser = await getUser(userId);
  const socketId = storedUser?.id;

  let eventType, message, isDeputyDj;

  const userIsDj = await isDj(socket.data.roomId, userId);

  if (userIsDj) {
    eventType = "END_DEPUTY_DJ_SESSION";
    message = `You are no longer a deputy DJ`;
    isDeputyDj = false;
    await removeDj(socket.data.roomId, userId);
  } else {
    eventType = "START_DEPUTY_DJ_SESSION";
    message = `You've been promoted to a deputy DJ. You may now add songs to the DJ's queue.`;
    isDeputyDj = true;
    await addDj(socket.data.roomId, userId);
  }

  const { user, users } = await updateUserAttributes(userId, { isDeputyDj });

  if (socketId) {
    io.to(socketId).emit(
      "event",
      {
        type: "NEW_MESSAGE",
        data: systemMessage(message, { type: "alert", status: "info" }),
      },
      { status: "info" }
    );

    io.to(socketId).emit("event", { type: eventType });
  }

  io.to(getRoomPath(socket.data.roomId)).emit("event", {
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
    const currentUser = await getUser(socket.data.userId);
    await syncQueue();
    const inQueue = getters.getQueue().find((x) => x.uri === uri);

    if (inQueue) {
      const djUsername = (await getUser(inQueue.userId))?.username ?? "Someone";

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
    sendMessage(io, queueMessage, socket.data.roomId);
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

export async function getSavedTracks({ socket }: HandlerConnections) {
  const spotifyApi = await getSpotifyApiForUser(socket.data.userId);
  try {
    const data = await spotifyApi.getMySavedTracks();
    socket.emit("event", { type: "SAVED_TRACKS_RESULTS", data: data.body });
  } catch (error) {
    console.error(error);
    socket.emit("event", { type: "SAVED_TRACKS_RESULTS_FAILURE", error });
  }
}

export async function handleUserJoined(
  { io, socket }: HandlerConnections,
  { user }: { user: User; users: User[] }
) {
  const room = await findRoom(socket.data.roomId);
  const deputyDjs = await getDjs(socket.data.roomId);
  if (room?.deputizeOnJoin && !deputyDjs.includes(user.userId)) {
    djDeputizeUser({ io, socket }, user.userId);
  }
}

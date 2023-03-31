const { find, concat, reject, map, uniqBy, get } = require("lodash/fp");

const systemMessage = require("../lib/systemMessage");
const sendMessage = require("../lib/sendMessage");
const updateUserAttributes = require("../lib/updateUserAttributes");
const spotifyApi = require("../lib/spotifyApi");
const refreshSpotifyToken = require("../lib/refreshSpotifyToken");

module.exports = function djHandlers(
  socket,
  io,
  { getUsers, getMessages, getDefaultSettings, getDeputyDjs, getQueue },
  { setUsers, setMessages, setSettings, setDeputyDjs, setQueue }
) {
  socket.on("set DJ", (userId) => {
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
      sendMessage(io, newMessage, { getMessages, setMessages });
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
      sendMessage(io, newMessage, { getMessages, setMessages });
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
  });

  socket.on("dj deputize user", (userId) => {
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

    const { user, users } = updateUserAttributes(
      userId,
      { isDeputyDj },
      { getUsers, setUsers }
    );

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
  });

  socket.on("queue song", async (uri) => {
    try {
      const data = await spotifyApi.addToQueue(uri);
      const user = getUsers().find(({ userId }) => userId === socket.userId);
      setQueue([
        ...getQueue(),
        { uri, userId: socket.userId, username: user.username },
      ]);
      socket.emit("event", {
        type: "SONG_QUEUED",
        data,
      });
      const queueMessage = systemMessage(
        `${user ? user.username : "Someone"} added a song to the queue`
      );
      sendMessage(io, queueMessage, { getMessages, setMessages });
    } catch (e) {
      console.log("error");
      console.log(e);
      socket.emit("event", {
        type: "SONG_QUEUE_FAILURE",
        data: {
          message: "Song could not be queued",
          error: e.message,
        },
      });
    }
  });

  socket.on("search spotify track", async ({ query, options }) => {
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
  });
};

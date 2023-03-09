const util = require("util");
const express = require("express");
const socketIO = require("socket.io");
const redisAdapter = require("socket.io-redis");
const fetchReleaseInfo = require("./lib/fetchReleaseInfo");
const systemMessage = require("./lib/systemMessage");
const radioMachine = require("./lib/machines/radioMachine");
const getStation = require("./lib/getStation");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const spotify = require("./spotify");
const spotifyApi = require("./lib/spotifyApi");
const refreshSpotifyToken = require("./lib/refreshSpotifyToken");

const authHandlers = require("./handlers/authHandlers");
const messageHandlers = require("./handlers/messageHandlers");

const fortyFiveMins = 2700000;

const PORT = process.env.PORT || 3000;
const {
  reject,
  find,
  takeRight,
  take,
  concat,
  map,
  uniq,
  uniqBy,
  compact,
  isEqual,
  isNil,
  get,
} = require("lodash/fp");
const { interpret } = require("xstate");
const createAndPopulateSpotifyPlaylist = require("./operations/createAndPopulateSpotifyPlaylist");
const activityHandlers = require("./handlers/activityHandlers");

const service = interpret(radioMachine);

service.start();

const streamURL = process.env.SERVER_URL;

const server = express()
  .use(express.static(__dirname + "/public"))
  .use(cors())
  .use(cookieParser())
  .get("/login", spotify.login)
  .get("/callback", spotify.callback)
  .listen(PORT, () => console.log(`Listening on ${PORT}`));

const io = socketIO(server, {
  cors: {
    origin: [
      "http://localhost:8000",
      "https://www.listen.show",
      "https://www.ross.show",
    ],
    credentials: true,
  },
  connectTimeout: 45000,
  pingTimeout: 60000,
  pingInterval: 25000,
  allowEIO3: false,
});

io.adapter(redisAdapter(process.env.REDIS_URL || "redis://127.0.0.1:6379"));

let numUsers = 0;

const defaultSettings = {
  fetchMeta: true,
  extraInfo: undefined,
  donationURL: undefined,
  password: null,
};

const reactionableTypes = ["message", "track"];

let users = [];
let messages = [];
let typing = [];
let meta = {};
let settings = { ...defaultSettings };
let cover = null;
let fetching = false;
let playlist = [];
let queue = [];
let deputyDjs = [];
let reactions = {
  message: {},
  track: {},
};
let offline = true;
let oAuthInterval;
const dataStores = {
  settings,
  deputyDjs,
  users,
  messages,
  typing,
  meta,
  cover,
  fetching,
  playlist,
  queue,
  reactions,
  defaultSettings,
};

const cleanUsers = () => {
  users = users.filter((user) => !!user.userId);
  return users;
};

const updateUserAttributes = (userId, attributes) => {
  const user = find({ userId }, users);
  const newUser = { ...user, ...attributes };
  users = uniqBy("userId", concat(newUser, reject({ userId }, users)));
  return { users: cleanUsers(), user: newUser };
};

const sendMessage = (message) => {
  io.emit("event", { type: "NEW_MESSAGE", data: message });
  console.log("new message", message);
  messages = take(120, concat(message, messages));
};

const setPassword = (pw) => {
  if (value === "") {
    console.log("clear password?");
    settings.password = null;
  } else {
    console.log("else set it", value);
    settings.password = pw;
  }
};

const createGetter = (key) => (data) => {
  return dataStores[key];
};
const createSetter = (key) => (data) => {
  dataStores[key] = data;
  console.log(dataStores);
};
const setters = {
  setDeputyDjs: createSetter("deputyDjs"),
  setUsers: createSetter("users"),
  setMessages: createSetter("messages"),
  setTyping: createSetter("typing"),
  setSettings: createSetter("settings"),
};
const getters = {
  getUsers: createGetter("users"),
  getMessages: createGetter("messages"),
  getSettings: createGetter("settings"),
  getPlaylist: createGetter("playlist"),
  getReactions: createGetter("reactions"),
  getDeputyDjs: createGetter("deputyDjs"),
  getCover: createGetter("cover"),
  getMeta: createGetter("meta"),
  getTyping: createGetter("typing"),
  getDefaultSettings: createGetter("defaultSettings"),
};

io.on("connection", (socket) => {
  console.log("CONNECTION");

  authHandlers(socket, io, getters, setters);
  messageHandlers(socket, io, getters, setters);
  activityHandlers(socket, io, getters, setters);

  // when the client emits 'new message', this listens and executes

  socket.on("set DJ", (userId) => {
    const user = find({ userId }, users);
    if (user && user.isDj) {
      return;
    }
    if (userId && user) {
      const newUser = { ...user, isDj: true };
      users = uniqBy(
        "userId",
        concat(
          newUser,
          reject(
            { userId },
            map((x) => ({ ...x, isDj: false }), users)
          )
        )
      );
      const content = `${user.username} is now the DJ`;
      const newMessage = systemMessage(content, {
        userId,
      });
      sendMessage(newMessage);
      io.emit("event", {
        type: "USER_JOINED",
        data: {
          user: newUser,
          users,
        },
      });
    } else {
      users = uniqBy(
        "userId",
        map((x) => ({ ...x, isDj: false }), users)
      );
      const content = `There's currently no DJ.`;
      const newMessage = systemMessage(content, {
        userId,
      });
      sendMessage(newMessage);
      io.emit("event", {
        type: "USER_JOINED",
        data: {
          users,
        },
      });
    }
    settings = { ...defaultSettings };
    io.emit("event", { type: "SETTINGS", data: settings });
  });

  socket.on("queue song", async (uri) => {
    try {
      console.log("uri", uri);
      const data = await spotifyApi.addToQueue(uri);
      const user = users.find(({ userId }) => userId === socket.userId);
      queue = [...queue, { uri, userId: socket.userId }];
      console.log(queue);
      socket.emit("event", {
        type: "SONG_QUEUED",
        data,
      });
      const queueMessage = systemMessage(
        `${user ? user.username : "Someone"} added a song to the queue`
      );
      sendMessage(queueMessage);
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

  socket.on("set password", (value) => {
    setPassword(value);
  });

  socket.on("fix meta", (title) => {
    setMeta(meta.station, title);
  });

  socket.on("set cover", (url) => {
    cover = url;
    meta = { ...meta, cover: url };
    io.emit("event", { type: "META", data: { meta } });
  });

  socket.on("get settings", (url) => {
    console.log("GET SETTINGS", settings);
    io.emit("event", { type: "SETTINGS", data: { settings } });
  });

  socket.on("add reaction", ({ emoji, reactTo, user }) => {
    if (reactionableTypes.indexOf(reactTo.type) === -1) {
      return;
    }
    reactions = {
      ...reactions,
      [reactTo.type]: {
        ...reactions[reactTo.type],
        [reactTo.id]: [
          ...takeRight(199, reactions[reactTo.type][reactTo.id] || []),
          { emoji: emoji.shortcodes, user: user.userId },
        ],
      },
    };
    io.emit("event", { type: "REACTIONS", data: { reactions } });
  });

  socket.on("remove reaction", ({ emoji, reactTo, user }) => {
    if (reactionableTypes.indexOf(reactTo.type) === -1) {
      return;
    }

    reactions = {
      ...reactions,
      [reactTo.type]: {
        ...reactions[reactTo.type],
        [reactTo.id]: reject(
          { emoji: emoji.shortcodes, user: user.userId },
          reactions[reactTo.type][reactTo.id] || []
        ),
      },
    };
    io.emit("event", { type: "REACTIONS", data: { reactions } });
  });

  socket.on("kick user", (user) => {
    console.log("kick user", user);
    const { userId } = user;
    const socketId = get("id", find({ userId }, users));

    const newMessage = systemMessage(
      `You have been kicked. I hope you deserved it.`,
      { status: "error", type: "alert", title: "Kicked" }
    );

    io.to(socketId).emit("event", { type: "NEW_MESSAGE", data: newMessage });
    io.to(socketId).emit("event", { type: "KICKED" });

    if (io.sockets.sockets.get(socketId)) {
      io.sockets.sockets.get(socketId).disconnect();
    }
  });

  socket.on("dj deputize user", (userId) => {
    const socketId = get("id", find({ userId }, users));
    var eventType, message, user;

    if (deputyDjs.includes(userId)) {
      eventType = "END_DEPUTY_DJ_SESSION";
      message = `You are no longer a deputy DJ`;
      const result = updateUserAttributes(userId, { isDeputyDj: false });
      user = result.user;
      deputyDjs = deputyDjs.filter((x) => x !== userId);
    } else {
      eventType = "START_DEPUTY_DJ_SESSION";
      message = `You've been promoted to a deputy DJ. You add song's to the DJ's queue.`;
      const result = updateUserAttributes(userId, { isDeputyDj: true });
      user = result.user;
      deputyDjs = [...deputyDjs, userId];
    }

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

  socket.on("clear playlist", () => {
    playlist = [];
    queue = [];
    io.emit("event", { type: "PLAYLIST", data: playlist });
  });

  socket.on("save playlist", async ({ name, uris }) => {
    console.log("SAVE PLAYLIST", name);
    try {
      const data = await createAndPopulateSpotifyPlaylist(name, uris);
      socket.emit("event", { type: "PLAYLIST_SAVED", data });
    } catch (error) {
      console.log(error);
      socket.emit("event", { type: "SAVE_PLAYLIST_FAILED", error });
    }
  });

  socket.on("settings", async (values) => {
    const { donationURL, extraInfo, fetchMeta, password } = values;
    const prevSettings = { ...settings };
    settings = {
      fetchMeta,
      donationURL,
      extraInfo,
      password,
    };
    io.emit("event", { type: "SETTINGS", data: settings });

    if (
      prevSettings.donationURL !== values.donationURL ||
      prevSettings.extraInfo !== values.extraInfo
    ) {
      const { user } = updateUserAttributes(socket.userId, {
        donationURL,
        extraInfo,
      });
      io.emit("event", {
        type: "USER_JOINED",
        data: {
          user,
          users,
        },
      });
    }

    if (!prevSettings.fetchMeta && values.fetchMeta) {
      console.log("fetchMeta turned on");
      const station = await getStation(
        `${streamURL}/stream?type=http&nocache=4`
      );
      await setMeta(station, get("title", station), { silent: true });
    }
  });
});

const setMeta = async (station, title, options = {}) => {
  console.log("setMeta");
  const silent = options.silent || false;
  if (!station) {
    fetching = false;
    meta = {};
    io.emit("event", { type: "META", data: { meta } });
    return;
  }
  // Lookup and emit track meta
  const info = (title || station.title).split("|");
  const track = info[0];
  const artist = info[1];
  const album = info[2];
  fetching = true;

  if (!artist && !album) {
    fetching = false;
    meta = { ...station };
    io.emit("event", { type: "META", data: { meta: { ...station } } });
    return;
  }
  const release = settings.fetchMeta
    ? await fetchReleaseInfo(`${track} ${artist} ${album}`)
    : {};

  const queuedTrack = queue.find(({ uri }) => uri === release?.uri);
  meta = {
    ...station,
    artist,
    album,
    track,
    release,
    cover,
    dj: queuedTrack?.userId,
  };
  const content = track
    ? `Up next: ${track} - ${artist} - ${album}`
    : `Up next: ${album}`;

  const newMessage = systemMessage(content, {
    artist,
    album,
    track,
    release,
  });

  if (!silent) {
    io.emit("event", { type: "NEW_MESSAGE", data: newMessage });
    messages = concat(newMessage, messages);
  }
  playlist = concat(
    {
      text: `${track} - ${artist} - ${album}`,
      album,
      artist,
      track,
      spotifyData: release,
      timestamp: Date.now(),
      dj: find(
        queuedTrack ? { userId: queuedTrack.userId } : { isDj: true },
        users
      ),
    },
    playlist
  );
  fetching = false;
  io.emit("event", { type: "META", data: { meta } });
  io.emit("event", { type: "PLAYLIST", data: playlist });
  if (queuedTrack) {
    queue = queue.filter(({ uri }) => uri !== queuedTrack.uri);
  }
  fetching = false;
};

setInterval(async () => {
  if (fetching) {
    return;
  }
  fetching = true;

  const station = await getStation(`${streamURL}/stream?type=http&nocache=4`);
  if ((!station || station.bitrate === "0") && !offline) {
    setMeta();
    console.log("set offline");
    offline = true;
    fetching = false;
    if (oAuthInterval) {
      clearInterval(oAuthInterval);
    }
    oAuthInterval = null;
    console.log(station);
    return;
  }

  if (station && station.title !== meta.title && !offline) {
    console.log(station);
    await setMeta(station, station.title);
  }

  if (
    offline &&
    station &&
    station.bitrate &&
    station.bitrate !== "" &&
    station.bitrate !== "0"
  ) {
    console.log(station);
    console.log("set online");
    cover = null;
    offline = false;
    try {
      await refreshSpotifyToken();
      oAuthInterval = setInterval(refreshSpotifyToken, fortyFiveMins);
    } catch (e) {
      console.log(e);
    } finally {
      await setMeta(station);
    }
  }
  fetching = false;
}, 3000);

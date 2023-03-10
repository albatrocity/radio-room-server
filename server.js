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
const refreshSpotifyToken = require("./lib/refreshSpotifyToken");

const authHandlers = require("./handlers/authHandlers");
const messageHandlers = require("./handlers/messageHandlers");
const djHandlers = require("./handlers/djHandlers");
const adminHandlers = require("./handlers/adminHandlers");

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
  return dataStores[key];
};
const setters = {
  setDeputyDjs: createSetter("deputyDjs"),
  setMessages: createSetter("messages"),
  setMeta: createSetter("meta"),
  setPlaylist: createSetter("playlist"),
  setQueue: createSetter("queue"),
  setReactions: createSetter("reactions"),
  setSettings: createSetter("settings"),
  setTyping: createSetter("typing"),
  setUsers: createSetter("users"),
};
const getters = {
  getCover: createGetter("cover"),
  getDefaultSettings: createGetter("defaultSettings"),
  getDeputyDjs: createGetter("deputyDjs"),
  getMessages: createGetter("messages"),
  getMeta: createGetter("meta"),
  getPlaylist: createGetter("playlist"),
  getQueue: createGetter("queue"),
  getReactions: createGetter("reactions"),
  getSettings: createGetter("settings"),
  getTyping: createGetter("typing"),
  getUsers: createGetter("users"),
};

io.on("connection", (socket) => {
  console.log("CONNECTION");

  authHandlers(socket, io, getters, setters);
  messageHandlers(socket, io, getters, setters);
  activityHandlers(socket, io, getters, setters);
  djHandlers(socket, io, getters, setters);
  adminHandlers(socket, io, getters, setters);

  // when the client emits 'new message', this listens and executes

  socket.on("set password", (value) => {
    setPassword(value);
  });

  socket.on("fix meta", (title) => {
    setMeta(meta.station, title);
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
    io.emit("event", { type: "META", data: { meta: setters.setMeta({}) } });
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
    const newMeta = setMeta({ ...station });
    io.emit("event", { type: "META", data: { meta: newMeta } });
    return;
  }
  const release = settings.fetchMeta
    ? await fetchReleaseInfo(`${track} ${artist} ${album}`)
    : {};

  const queuedTrack = queue.find(({ uri }) => uri === release?.uri);
  const newMeta = {
    ...station,
    artist,
    album,
    track,
    release,
    cover,
    dj: queuedTrack?.userId,
  };
  setters.setMeta(newMeta);
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
  const newPlaylist = setters.setPlaylist(
    concat(
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
    )
  );
  fetching = false;
  io.emit("event", { type: "META", data: { meta: newMeta } });
  io.emit("event", { type: "PLAYLIST", data: newPlaylist });
  if (queuedTrack) {
    setters.setQueue(
      getters.getQueue.filter(({ uri }) => uri !== queuedTrack.uri)
    );
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

  if (station && station.title !== getters.getMeta().title && !offline) {
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

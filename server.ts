import express from "express";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import cors from "cors";
import cookieParser from "cookie-parser";
import { find } from "lodash/fp";
import { createClient } from "redis";

import fetchReleaseInfo from "./lib/fetchReleaseInfo";
import systemMessage from "./lib/systemMessage";
import getStation from "./lib/getStation";
import refreshSpotifyToken from "./lib/refreshSpotifyToken";
import { login, callback } from "./spotify";
import { createGetters, createSetters } from "./lib/dataStore";

import activityHandlers from "./handlers/activityHandlers";
import authHandlers from "./handlers/authHandlers";
import messageHandlers from "./handlers/messageHandlers";
import djHandlers from "./handlers/djHandlers";
import adminHandlers from "./handlers/adminHandlers";

import { FetchMetaOptions } from "./types/FetchMetaOptions";
import { Settings } from "./types/Settings";
import { DataStores } from "./types/DataStores";
import { Station } from "types/Station";
import { RadioSocket } from "types/RadioSocket";

const fortyFiveMins = 2700000;

const PORT = process.env.PORT || 3000;

const streamURL = process.env.SERVER_URL;

const httpServer = express()
  .use(express.static(__dirname + "/public"))
  .use(cors())
  .use(cookieParser())
  .get("/login", login)
  .get("/callback", callback)
  .listen(PORT, () => console.log(`Listening on ${PORT}`));

const io = new Server(httpServer, {
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

const pubClient = createClient({
  url: process.env.REDIS_URL || "redis://127.0.0.1:6379",
});
const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));

const defaultSettings: Settings = {
  fetchMeta: true,
  extraInfo: undefined,
  donationURL: undefined,
  password: null,
};

let offline = true;
let oAuthInterval: NodeJS.Timer | null;

const dataStores: DataStores = {
  station: undefined,
  settings: { ...defaultSettings },
  deputyDjs: [],
  users: [],
  messages: [],
  typing: [],
  meta: {},
  cover: null,
  fetching: false,
  playlist: [],
  queue: [],
  reactions: {
    message: {},
    track: {},
  },
  defaultSettings,
};

const getters = createGetters(dataStores);
const setters = createSetters(dataStores);

io.on("connection", (socket: RadioSocket) => {
  console.log("CONNECTION");

  authHandlers(socket, io, getters, setters);
  messageHandlers(socket, io, getters, setters);
  activityHandlers(socket, io, getters, setters);
  djHandlers(socket, io, getters, setters);
  adminHandlers(socket, io, getters, setters, { fetchAndSetMeta });
});

const fetchAndSetMeta = async (
  station?: Station,
  title?: string,
  options: FetchMetaOptions = {}
) => {
  console.log("fetchMeta=====", getters.getSettings().fetchMeta);
  console.log("setMeta");
  const silent = options.silent || false;
  if (!station) {
    setters.setFetching(false);
    io.emit("event", { type: "META", data: { meta: setters.setMeta({}) } });
    return;
  }
  // Lookup and emit track meta
  const info = (title || station.title || "").split("|");
  const track = info[0];
  const artist = info[1];
  const album = info[2];
  setters.setFetching(false);

  if (!artist && !album) {
    setters.setFetching(false);
    const newMeta = fetchAndSetMeta({ ...station });
    io.emit("event", { type: "META", data: { meta: newMeta } });
    return;
  }
  const release = getters.getSettings().fetchMeta
    ? await fetchReleaseInfo(`${track} ${artist} ${album}`)
    : {};

  const queuedTrack = getters
    .getQueue()
    .find(({ uri }) => uri === release?.uri);
  const newMeta = {
    ...station,
    artist,
    album,
    track,
    release,
    cover: getters.getCover(),
    dj: queuedTrack?.userId
      ? { userId: queuedTrack.userId, username: queuedTrack.username }
      : null,
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
    setters.setMessages([...getters.getMessages(), newMessage]);
  }
  const newPlaylist = setters.setPlaylist([
    ...getters.getPlaylist(),
    {
      text: `${track} - ${artist} - ${album}`,
      album,
      artist,
      track,
      spotifyData: release,
      timestamp: Date.now(),
      dj: find(
        queuedTrack ? { userId: queuedTrack.userId } : { isDj: true },
        getters.getUsers()
      ),
    },
  ]);
  setters.setFetching(false);
  io.emit("event", { type: "META", data: { meta: newMeta } });
  io.emit("event", { type: "PLAYLIST", data: newPlaylist });
  if (queuedTrack) {
    setters.setQueue(
      getters.getQueue().filter(({ uri }) => uri !== queuedTrack.uri)
    );
  }
};

setInterval(async () => {
  if (getters.getFetching()) {
    return;
  }
  setters.setFetching(true);

  const station = await getStation(`${streamURL}/stream?type=http&nocache=4`);
  if ((!station || station.bitrate === "0") && !offline) {
    fetchAndSetMeta();
    console.log("set offline");
    offline = true;
    setters.setFetching(false);
    if (oAuthInterval) {
      clearInterval(oAuthInterval);
    }
    oAuthInterval = null;
    console.log(station);
    return;
  }

  if (station && station.title !== getters.getMeta().title && !offline) {
    console.log(station);
    await fetchAndSetMeta(station, station.title);
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
    setters.setCover(null);
    offline = false;
    try {
      await refreshSpotifyToken();
      oAuthInterval = setInterval(refreshSpotifyToken, fortyFiveMins);
    } catch (e) {
      console.log(e);
    } finally {
      await fetchAndSetMeta(station);
    }
  }
  setters.setFetching(false);
}, 3000);

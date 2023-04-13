import express from "express";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createClient } from "redis";

import getStation from "./operations/getStation";
import refreshSpotifyToken from "./operations/refreshSpotifyToken";
import { login, callback } from "./spotify";
import { createGetters, createSetters } from "./lib/dataStore";
import fetchAndSetMeta from "./operations/fetchAndSetMeta";

import activityHandlers from "./handlers/activityHandlers";
import authHandlers from "./handlers/authHandlers";
import messageHandlers from "./handlers/messageHandlers";
import djHandlers from "./handlers/djHandlers";
import adminHandlers from "./handlers/adminHandlers";

import { Settings } from "./types/Settings";
import { DataStores } from "./types/DataStores";

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
pubClient.connect();
subClient.connect();

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

io.on("connection", (socket) => {
  authHandlers(socket, io, getters, setters);
  messageHandlers(socket, io, getters, setters);
  activityHandlers(socket, io, getters, setters);
  djHandlers(socket, io, getters, setters);
  adminHandlers(socket, io, getters, setters);
});

setInterval(async () => {
  if (getters.getFetching()) {
    return;
  }
  setters.setFetching(true);

  const station = await getStation(`${streamURL}/stream?type=http&nocache=4`);
  if ((!station || station.bitrate === "0") && !offline) {
    fetchAndSetMeta({ getters, setters, io });
    offline = true;
    setters.setFetching(false);
    if (oAuthInterval) {
      clearInterval(oAuthInterval);
    }
    oAuthInterval = null;
    return;
  }

  if (station && station.title !== getters.getMeta().title && !offline) {
    await fetchAndSetMeta({ getters, setters, io }, station, station.title);
  }

  if (
    offline &&
    station &&
    station.bitrate &&
    station.bitrate !== "" &&
    station.bitrate !== "0"
  ) {
    setters.setCover(null);
    offline = false;
    try {
      await refreshSpotifyToken();
      oAuthInterval = setInterval(refreshSpotifyToken, fortyFiveMins);
    } catch (e) {
      console.log(e);
    } finally {
      await fetchAndSetMeta({ getters, setters, io }, station);
    }
  }
  setters.setFetching(false);
}, 3000);

import { createAdapter } from "@socket.io/redis-adapter";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { Server } from "socket.io";

import { pubClient, subClient } from "./lib/redisClients";
import { events } from "./lib/eventEmitter";
import { getters, setters } from "./lib/dataStore";
import fetchAndSetMeta from "./operations/fetchAndSetMeta";
import getStation from "./operations/getStation";
import refreshSpotifyToken from "./operations/spotify/refreshSpotifyToken";
import { callback, login } from "./spotify";

import activityController, {
  lifecycleEvents as activityEvents,
} from "./controllers/activityController";
import adminController from "./controllers/adminController";
import authController from "./controllers/authController";
import djController, {
  lifecycleEvents as djEvents,
} from "./controllers/djController";

import messageController from "./controllers/messageController";

const fortyFiveMins = 2700000;

const PORT = Number(process.env.PORT ?? 3000);
console.log("PORT", PORT);

const streamURL = process.env.SERVER_URL;

const httpServer = express()
  .use(express.static(__dirname + "/public"))
  .use(cors())
  .use(cookieParser())
  .get("/login", login)
  .get("/callback", callback)
  .set("event", events)
  .listen(PORT, "0.0.0.0", () => console.log(`Listening on ${PORT}`));

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

pubClient.connect();
subClient.connect();

io.adapter(createAdapter(pubClient, subClient));

let offline = true;
let oAuthInterval: NodeJS.Timer | null;

io.on("connection", (socket) => {
  authController(socket, io);
  messageController(socket, io);
  activityController(socket, io);
  djController(socket, io);
  adminController(socket, io);
});

// lifecycle events
djEvents(io);
activityEvents(io);

setInterval(async () => {
  if (getters.getFetching()) {
    return;
  }
  setters.setFetching(true);

  const station = await getStation(`${streamURL}/stream?type=http&nocache=4`);
  if ((!station || station.bitrate === "0") && !offline) {
    fetchAndSetMeta({ io });
    offline = true;
    setters.setFetching(false);
    if (oAuthInterval) {
      clearInterval(oAuthInterval);
    }
    oAuthInterval = null;
    return;
  }

  if (station && station.title !== getters.getMeta().title && !offline) {
    await fetchAndSetMeta({ io }, station, station.title);
  }

  if (
    offline &&
    station &&
    station.bitrate &&
    station.bitrate !== "" &&
    station.bitrate !== "0"
  ) {
    setters.setSettings({ ...getters.getSettings(), artwork: undefined });
    offline = false;
    try {
      await refreshSpotifyToken();
      oAuthInterval = setInterval(refreshSpotifyToken, fortyFiveMins);
    } catch (e) {
      console.log(e);
    } finally {
      await fetchAndSetMeta({ io }, station);
    }
  }
  setters.setFetching(false);
}, 3000);

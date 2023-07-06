import { createAdapter } from "@socket.io/redis-adapter";
import cookieParser from "cookie-parser";
import session from "express-session";
import cors from "cors";
import express, { Request, Response } from "express";
import RedisStore from "connect-redis";
import { Server } from "socket.io";

import { FORTY_FIVE_MINS } from "./lib/constants";
import { pubClient, subClient } from "./lib/redisClients";
import { events } from "./lib/eventEmitter";
import { getters, setters } from "./lib/dataStore";
import fetchAndSetMeta from "./operations/fetchAndSetMeta";
import getStation from "./operations/getStation";
import { callback, login } from "./controllers/spotifyAuthController";
import { create, findRoom } from "./controllers/roomsController";

import activityController, {
  lifecycleEvents as activityEvents,
} from "./controllers/activityController";
import adminController from "./controllers/adminController";
import authController from "./controllers/authController";
import djController, {
  lifecycleEvents as djEvents,
} from "./controllers/djController";

import messageController from "./controllers/messageController";
import refreshAllSpotifyTokens from "./operations/spotify/refreshAllSpotifyTokens";

const PORT = Number(process.env.PORT ?? 3000);

const streamURL = process.env.SERVER_URL;

const redisStore = new RedisStore({
  client: pubClient,
  prefix: "session:",
});

const sessionMiddleware = session({
  store: redisStore,
  secret: process.env.SESSION_SECRET || "secret",
  saveUninitialized: true,
  resave: true,
});

const httpServer = express()
  .use(express.static(__dirname + "/public"))
  .use(sessionMiddleware)
  .use(cors())
  .use(express.json())
  .use(cookieParser())
  .get("/rooms/:id", findRoom)
  .post("/rooms", create)
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
  allowRequest: (req, callback) => {
    // with HTTP long-polling, we have access to the HTTP response here, but this is not
    // the case with WebSocket, so we provide a dummy response object
    const fakeRes = {
      getHeader() {
        return [];
      },
      // setHeader(key: string, values: string[]) {
      //     req.cookieHolder = values[0];
      // },
      writeHead() {},
    };
    sessionMiddleware(req as Request, fakeRes as unknown as Response, () => {
      if (req.session) {
        // trigger the setHeader() above
        fakeRes.writeHead();
        // manually save the session (normally triggered by res.end())
        req.session.save();
      }
      callback(null, true);
    });
  },
});

pubClient.connect();
subClient.connect();

io.adapter(createAdapter(pubClient, subClient));
io.engine.use(sessionMiddleware);
// io.engine.on("initial_headers", (headers: { [key: string]: string }, req: IncomingMessage) => {
//   if (req.cookieHolder) {
//       headers["set-cookie"] = req.cookieHolder;
//       delete req.cookieHolder;
//   }
// })

let offline = true;
let oAuthInterval: NodeJS.Timer | null;

io.on("connection", (socket) => {
  // @ts-ignore
  const req = socket.request;
  // req.session.socketId = socket.id;
  socket.use((__, next) => {
    req.session.reload((err) => {
      if (err) {
        socket.disconnect();
      } else {
        next();
      }
    });
  });
  authController(socket, io);
  messageController(socket, io);
  activityController(socket, io);
  djController(socket, io);
  adminController(socket, io);
});

// lifecycle events
djEvents(io);
activityEvents(io);

async function pollStationInfo() {
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
      await refreshAllSpotifyTokens();
      oAuthInterval = setInterval(() => {
        refreshAllSpotifyTokens();
      }, FORTY_FIVE_MINS);
    } catch (e) {
      console.log(e);
    } finally {
      await fetchAndSetMeta({ io }, station);
    }
  }
  setters.setFetching(false);
}

setInterval(() => {
  pollStationInfo();
}, 3000);

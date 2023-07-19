import { execa } from "execa";
import { createAdapter } from "@socket.io/redis-adapter";
import cookieParser from "cookie-parser";
import session from "express-session";
import RedisStore from "connect-redis";
import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import { Server } from "socket.io";
import { User } from "./types/User";

import { pubClient, subClient } from "./lib/redisClients";
import { bindPubSubHandlers } from "./pubSub/handlers";
import { events } from "./lib/eventEmitter";
import { callback, login } from "./controllers/spotifyAuthController";
import roomsController, {
  create,
  deleteRoom,
  findRoom,
  findRooms,
} from "./controllers/roomsController";

import activityController, {
  lifecycleEvents as activityEvents,
} from "./controllers/activityController";
import adminController from "./controllers/adminController";
import authController from "./controllers/authController";
import djController, {
  lifecycleEvents as djEvents,
} from "./controllers/djController";
import messageController from "./controllers/messageController";

declare module "express-session" {
  interface Session {
    user?: User;
    roomId?: string;
  }
}

const PORT = Number(process.env.PORT ?? 3000);

const redisStore = new RedisStore({ client: pubClient, prefix: "s:" });

const sessionMiddleware = session({
  store: redisStore,
  resave: true, // required: force lightweight session keep alive (touch)
  saveUninitialized: false, // recommended: only save session when data exists
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 365, // 1 year
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    httpOnly: false,
  },
  secret: process.env.SESSION_SECRET ?? "secret",
});

const auth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.user) {
    return res.sendStatus(403);
  }
  next();
};

const httpServer = express()
  .use(express.static(__dirname + "/public"))
  .use(
    cors({
      origin: ["http://localhost:8000", "https://listen.show"],
      preflightContinue: true,
      credentials: true,
    })
  )
  .use(express.json())
  .use(cookieParser())
  .use(sessionMiddleware)
  .get("/rooms/", findRooms)
  .get("/rooms/:id", findRoom)
  .post("/rooms", create)
  .delete("/rooms/:id", deleteRoom)
  .get("/login", login)
  .get("/callback", callback)
  .set("event", events)
  .listen(PORT, "0.0.0.0", () => console.log(`Listening on ${PORT}`));

const io = new Server(httpServer, {
  connectTimeout: 45000,
  pingTimeout: 60000,
  pingInterval: 25000,
  allowEIO3: false,
});

pubClient.connect();
subClient.connect();

io.adapter(createAdapter(pubClient, subClient));
io.use((socket, next) => {
  /** @ts-ignore */
  sessionMiddleware(socket.request, socket.request.res || {}, next);
  // sessionMiddleware(socket.request, socket.request.res, next); will not work with websocket-only
  // connections, as 'socket.request.res' will be undefined in that case
});

let offline = true;
let oAuthInterval: NodeJS.Timer | null;

io.on("connection", (socket) => {
  // @ts-ignore
  const req = socket.request;
  authController(socket, io);
  messageController(socket, io);
  activityController(socket, io);
  djController(socket, io);
  adminController(socket, io);
  roomsController(socket, io);
});

// lifecycle events
djEvents(io);
activityEvents(io);
bindPubSubHandlers(io);

async function startJobs() {
  try {
    // @ts-ignore
    await execa("node", ["dist/jobs/processor.js"]).pipeStdout(process.stdout);
  } catch (e) {
    console.error(e);
  }
}

startJobs();

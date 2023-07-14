import { execa } from "execa";
import { createAdapter } from "@socket.io/redis-adapter";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { Server } from "socket.io";

import { pubClient, subClient } from "./lib/redisClients";
import { bindPubSubHandlers } from "./pubSub/handlers";
import { events } from "./lib/eventEmitter";
import { callback, login } from "./controllers/spotifyAuthController";
import roomsController, {
  create,
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

const PORT = Number(process.env.PORT ?? 3000);

const httpServer = express()
  .use(express.static(__dirname + "/public"))
  .use(cors())
  .use(express.json())
  .use(cookieParser())
  .get("/rooms/", findRooms)
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
});

pubClient.connect();
subClient.connect();

io.adapter(createAdapter(pubClient, subClient));

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

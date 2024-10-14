import { createClient } from "redis";

export const pubClient = createClient({
  url: process.env.REDIS_TLS_URL ?? "redis://127.0.0.1:6379",
  socket: {
    tls: true,
    rejectUnauthorized: false,
  },
});
export const subClient = pubClient.duplicate();

pubClient.on("error", (error) => {
  console.log("pubClient error");
  console.error(error);
});

subClient.on("error", (error) => {
  console.log("subClient error");
  console.error(error);
});

import { createClient } from "redis";

export const pubClient = createClient({
  url: process.env.REDIS_URL || "redis://127.0.0.1:6379",
});
export const subClient = pubClient.duplicate();

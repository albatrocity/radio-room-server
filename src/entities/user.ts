import { Schema, Repository } from "redis-om";

import { pubClient } from "../lib/redisClients";

// defines a RedisOm schema for the user model
export const userSchema = new Schema("user", {
  id: {
    type: "string",
    field: "userId",
  },
  username: {
    type: "string",
  },
  isAdmin: {
    type: "boolean",
  },
  isDj: {
    type: "boolean",
  },
  isDeputyDj: {
    type: "boolean",
  },
  status: {
    type: "string",
  },
});

export const userRepository = new Repository(userSchema, pubClient);

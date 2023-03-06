const { createClient: redisCreateClient } = require("redis");

async function createClient() {
  const client = redisCreateClient({
    url: process.env.REDIS_URL || "redis://127.0.0.1:6379",
  });
  await client.connect();

  return client;
}

module.exports = {
  createClient,
};

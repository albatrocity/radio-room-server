const { createClient } = require("redis");

var client;

async function getClient() {
  if (client) {
    return client;
  }
  client = createClient({
    url: process.env.REDIS_URL || "redis://127.0.0.1:6379",
  });
  await client.connect();

  return client;
}

module.exports = {
  getClient,
};

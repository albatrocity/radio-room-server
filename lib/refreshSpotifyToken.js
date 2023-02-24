const spotifyApi = require("./spotifyApi");
const { createClient } = require("../redisClient");

const constants = require("./constants");

async function refreshSpotifyToken() {
  const redisClient = await createClient();

  const refreshToken = await redisClient.get(constants.SPOTIFY_REFRESH_TOKEN);
  if (refreshToken) {
    spotifyApi.setRefreshToken(refreshToken);

    const data = await spotifyApi.refreshAccessToken();
    spotifyApi.setAccessToken(data.body["access_token"]);
    await redisClient.set(
      constants.SPOTIFY_ACCESS_TOKEN,
      data.body["access_token"]
    );
    redisClient.disconnect();
    return data.body["access_token"];
  }
  redisClient.disconnect();
  return null;
}

module.exports = refreshSpotifyToken;

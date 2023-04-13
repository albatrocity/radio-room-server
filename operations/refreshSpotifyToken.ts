import spotifyApi from "../lib/spotifyApi";
import { createClient } from "../redisClient";

import { SPOTIFY_REFRESH_TOKEN, SPOTIFY_ACCESS_TOKEN } from "../lib/constants";

async function refreshSpotifyToken() {
  console.log("refresh OAuth token");
  const redisClient = await createClient();

  const refreshToken = await redisClient.get(SPOTIFY_REFRESH_TOKEN);
  if (refreshToken) {
    spotifyApi.setRefreshToken(refreshToken);

    const data = await spotifyApi.refreshAccessToken();
    spotifyApi.setAccessToken(data.body["access_token"]);
    await redisClient.set(SPOTIFY_ACCESS_TOKEN, data.body["access_token"]);
    redisClient.disconnect();
    return data.body["access_token"];
  }
  redisClient.disconnect();
  return null;
}

export default refreshSpotifyToken;

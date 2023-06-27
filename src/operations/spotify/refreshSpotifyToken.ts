import { makeSpotifyApi } from "../../lib/spotifyApi";
import { createClient } from "../../redisClient";
import globalSpotifyApi from "../../lib/spotifyApi";

import {
  SPOTIFY_REFRESH_TOKEN,
  SPOTIFY_ACCESS_TOKEN,
} from "../../lib/constants";

async function refreshSpotifyToken(userId: string = "app") {
  console.log(`refresh OAuth token for ${userId}`);
  const redisClient = await createClient();
  const spotifyApi = userId === "app" ? globalSpotifyApi : makeSpotifyApi();

  try {
    const refreshToken = await redisClient.get(
      `${SPOTIFY_REFRESH_TOKEN}:${userId}`
    );
    if (refreshToken) {
      spotifyApi.setRefreshToken(refreshToken);

      const data = await spotifyApi.refreshAccessToken();
      spotifyApi.setAccessToken(data.body["access_token"]);

      await redisClient.set(SPOTIFY_ACCESS_TOKEN, data.body["access_token"]);
      return data.body["access_token"];
    }
  } catch (e) {
    console.error(e);
  } finally {
    redisClient.disconnect();
  }
  return null;
}

export default refreshSpotifyToken;

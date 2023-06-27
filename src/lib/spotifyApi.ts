import { createClient } from "../redisClient";
import SpotifyWebApi from "spotify-web-api-node";

const SPOTIFY_ACCESS_TOKEN = "spotifyAccessToken";

const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;
const redirect_uri = process.env.REDIRECT_URI;

export async function getSpotifyToken(userId: string) {
  const client = await createClient();
  try {
    const token = await client.get(`${SPOTIFY_ACCESS_TOKEN}:${userId}}`);
    return token;
  } catch (e) {
    console.error(e);
    return null;
  } finally {
    await client.disconnect();
  }
}

export function makeSpotifyApi() {
  return new SpotifyWebApi({
    clientId: client_id,
    clientSecret: client_secret,
    redirectUri: redirect_uri,
  });
}

export async function setApiToken(
  userId: string = "app",
  spotifyApi: SpotifyWebApi
) {
  const token = await getSpotifyToken(userId);
  console.log(`set token ${token}`);
  if (token) {
    spotifyApi.setAccessToken(token);
  }
}

const globalSpotifyApi = makeSpotifyApi();
if (process.env.NODE_ENV !== "test") {
  setApiToken("app", globalSpotifyApi);
}

export default globalSpotifyApi;

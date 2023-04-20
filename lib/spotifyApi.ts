import { createClient } from "../redisClient";
import SpotifyWebApi from "spotify-web-api-node";

const SPOTIFY_ACCESS_TOKEN = "spotifyAccessToken";

const client_id = process.env.CLIENT_ID; // Your client id
const client_secret = process.env.CLIENT_SECRET; // Your secret
const redirect_uri = process.env.REDIRECT_URI; // Your redirect uri

async function getSpotifyToken() {
  const client = await createClient();
  const token = await client.get(SPOTIFY_ACCESS_TOKEN);
  await client.disconnect();
  return token;
}

const spotifyApi = new SpotifyWebApi({
  clientId: client_id,
  clientSecret: client_secret,
  redirectUri: redirect_uri,
});

async function setApiToken() {
  const token = await getSpotifyToken();
  console.log(`set token ${token}`);
  if (token) {
    spotifyApi.setAccessToken(token);
  }
}

if (process.env.NODE_ENV !== "test") {
  setApiToken();
}

export default spotifyApi;

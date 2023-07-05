// fetches a user's spotify tokens from Redis
import {
  SPOTIFY_ACCESS_TOKEN,
  SPOTIFY_REFRESH_TOKEN,
} from "../../lib/constants";
import getAdminUserId from "../../lib/getAdminUserId";
import { createClient } from "../../redisClient";

export default async function getStoredUserSpotifyTokens(userId: string) {
  const adminUserId = await getAdminUserId();
  const isGlobalAccount = !userId || (!!userId && userId === adminUserId);
  const userKey = isGlobalAccount ? "app" : userId;

  const accessKey = `${SPOTIFY_ACCESS_TOKEN}:${userKey}`;
  const refreshKey = `${SPOTIFY_REFRESH_TOKEN}:${userKey}`;

  const client = await createClient();
  try {
    const accessToken = await client.get(accessKey);
    const refreshToken = await client.get(refreshKey);
    return { accessToken, refreshToken };
  } catch (e) {
    console.error(e);
    return { accessToken: undefined, refreshToken: undefined };
  } finally {
    client.disconnect();
  }
}

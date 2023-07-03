// fetches a user's spotify tokens from Redis
import {
  SPOTIFY_ACCESS_TOKEN,
  SPOTIFY_REFRESH_TOKEN,
} from "../../lib/constants";
import getAdminUserId from "../../lib/getAdminUserId";
import { createClient } from "../../redisClient";

export default async function removeStoredUserSpotifyTokens(userId: string) {
  const adminUserId = await getAdminUserId();
  const isGlobalAccount = !userId || (!!userId && userId === adminUserId);
  const userKey = isGlobalAccount ? "app" : userId;

  const accessKey = `${SPOTIFY_ACCESS_TOKEN}:${userKey}`;
  const refreshKey = `${SPOTIFY_REFRESH_TOKEN}:${userKey}`;

  const client = await createClient();
  try {
    await client.del(accessKey);
    await client.del(refreshKey);
    return {
      message: "Successfully removed user's Spotify tokens from Redis",
    };
  } catch (e) {
    console.error(e);
    return { error: String(e) };
  } finally {
    client.disconnect();
  }
}

import getAdminUserId from "../../lib/getAdminUserId";
import { createClient } from "../../redisClient";
import globalSpotifyApi from "../../lib/spotifyApi";

import {
  FORTY_FIVE_MINS,
  SPOTIFY_ACCESS_TOKEN,
  SPOTIFY_REFRESH_TOKEN,
  THREE_DAYS,
} from "../../lib/constants";

export default async function storeUserSpotifyTokens({
  access_token,
  refresh_token,
  userId,
}: {
  access_token: string;
  refresh_token: string;
  userId: string;
}) {
  const adminUserId = await getAdminUserId();
  const isGlobalAccount = !userId || (!!userId && userId === adminUserId);
  const userKey = isGlobalAccount ? "app" : userId;

  if (isGlobalAccount) {
    globalSpotifyApi.setAccessToken(access_token);
    globalSpotifyApi.setRefreshToken(refresh_token);
  }

  const accessKey = `${SPOTIFY_ACCESS_TOKEN}:${userKey}`;
  const refreshKey = `${SPOTIFY_REFRESH_TOKEN}:${userKey}`;

  const client = await createClient();
  try {
    await client.set(accessKey, access_token, { PX: FORTY_FIVE_MINS });
    await client.set(refreshKey, refresh_token, {
      PX: THREE_DAYS,
    });
  } catch (e) {
    console.error(e);
  } finally {
    client.disconnect();
  }
}

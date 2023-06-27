import globalSpotifyApi, { makeSpotifyApi } from "../../lib/spotifyApi";
import getStoredUserSpotifyTokens from "./getStoredUserSpotifyTokens";

export default async function getSpotifyApiForUser(userId: string = "app") {
  const { accessToken, refreshToken } = await getStoredUserSpotifyTokens(
    userId
  );

  const spotifyApi = accessToken
    ? makeSpotifyApi({
        accessToken,
        refreshToken: refreshToken ?? undefined,
      })
    : globalSpotifyApi;

  return spotifyApi;
}

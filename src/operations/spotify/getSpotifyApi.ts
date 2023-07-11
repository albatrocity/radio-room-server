import globalSpotifyApi, { makeSpotifyApi } from "../../lib/spotifyApi";
import { findRoom } from "../data";
import getStoredUserSpotifyTokens from "./getStoredUserSpotifyTokens";

export async function getSpotifyApiForUser(userId: string = "app") {
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

export async function getSpotifyApiForRoom(roomId: string) {
  const room = await findRoom(roomId);
  if (!room) {
    throw new Error(`Room ${roomId} not found`);
  }
  if (!room.creator) {
    throw new Error(`Room Creator for ${roomId} not found`);
  }

  const { accessToken, refreshToken } = await getStoredUserSpotifyTokens(
    room.creator
  );

  const spotifyApi = accessToken
    ? makeSpotifyApi({
        accessToken,
        refreshToken: refreshToken ?? undefined,
      })
    : globalSpotifyApi;

  return spotifyApi;
}

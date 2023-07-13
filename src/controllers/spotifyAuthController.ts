import querystring from "querystring";

import { Request, Response } from "express";
import generateRandomString from "../lib/generateRandomString";
import getSpotifyAuthTokens from "../operations/spotify/getSpotifyAuthTokens";
import storeUserSpotifyTokens from "../operations/spotify/storeUserSpotifyTokens";
import { makeSpotifyApi } from "../lib/spotifyApi";
import { removeUserRoomsSpotifyError } from "../operations/data";

const client_id = process.env.CLIENT_ID; // Your client id
const redirect_uri = process.env.REDIRECT_URI; // Your redirect uri

const stateKey = "spotify_auth_state";
const userIdKey = "spotify_auth_user_id";
const redirectKey = "after_spotify_auth_redirect";

function getUserIdParam(query: Request["query"]) {
  if (Array.isArray(query.userId)) {
    return query.userId[0];
  }
  if (Array.isArray(query.userId)) {
    return query.userId[0];
  }
  return query.userId;
}

export async function login(req: Request, res: Response) {
  const state = generateRandomString(16);
  // get userId from query params
  const userId = getUserIdParam(req.query);

  res.cookie(stateKey, state);
  if (userId) {
    res.cookie(userIdKey, userId);
  }
  res.cookie(redirectKey, req.query.redirect);

  const scope =
    "user-read-private user-read-email playlist-read-collaborative playlist-modify-private playlist-modify-public user-read-playback-state user-modify-playback-state user-read-currently-playing user-library-modify";

  res.redirect(
    "https://accounts.spotify.com/authorize?" +
      querystring.stringify({
        response_type: "code",
        client_id: client_id,
        scope: scope,
        redirect_uri: redirect_uri,
        state: state,
        ...(userId ? { userId: userId } : {}),
      })
  );
}

export async function callback(req: Request, res: Response) {
  const code = req.query.code ?? null;
  const state = req.query.state ?? null;

  const storedState = req.cookies ? req.cookies[stateKey] : null;
  const redirect = req.cookies ? req.cookies[redirectKey] : null;

  if (state === null || state !== storedState || !code) {
    res.redirect(
      "/#" +
        querystring.stringify({
          error: "state_mismatch",
        })
    );
  } else {
    res.clearCookie(stateKey);

    try {
      const { access_token, refresh_token } = await getSpotifyAuthTokens(code);

      const spotify = await makeSpotifyApi({
        accessToken: access_token,
        refreshToken: refresh_token,
      });
      const me = await spotify.getMe();
      const userId = me.body.id;
      const challenge = generateRandomString(16);

      await storeUserSpotifyTokens({
        access_token,
        refresh_token,
        userId: userId,
        challenge,
      });

      await removeUserRoomsSpotifyError(userId);

      if (process.env.APP_URL) {
        const params = {
          toast: "Spotify authentication successful",
          userId,
          challenge,
        };

        res.redirect(
          `${process.env.APP_URL}${redirect ?? ""}?${querystring.stringify(
            params
          )}`
        );
      } else {
        res.send({ access_token });
      }
    } catch (e) {
      console.log(e);
      res.send({
        error: e,
      });
    }
  }
}

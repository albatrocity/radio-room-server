import querystring from "querystring";

import { Request, Response } from "express";
import generateRandomString from "../lib/generateRandomString";
import getSpotifyAuthTokens from "../operations/spotify/getSpotifyAuthTokens";
import getAdminUserId from "../lib/getAdminUserId";
import storeUserSpotifyTokens from "../operations/spotify/storeUserSpotifyTokens";

const client_id = process.env.CLIENT_ID; // Your client id
const redirect_uri = process.env.REDIRECT_URI; // Your redirect uri

const stateKey = "spotify_auth_state";
const userIdKey = "spotify_auth_user_id";

export async function login(req: Request, res: Response) {
  const state = generateRandomString(16);
  // get userId from query params
  const userId = Array.isArray(req.query.userId)
    ? req.query.userId[0]
    : Array.isArray(req.query.userId)
    ? req.query.userId[0]
    : req.query.userId;

  res.cookie(stateKey, state);
  if (userId) {
    res.cookie(userIdKey, userId);
  }

  const adminUserId = await getAdminUserId();
  const isAdmin = !userId || adminUserId === userId;

  const scope = isAdmin
    ? "user-read-private user-read-email playlist-read-collaborative playlist-modify-private playlist-modify-public user-read-playback-state user-modify-playback-state user-read-currently-playing user-library-modify"
    : "playlist-read-collaborative playlist-read-private playlist-modify-private user-library-read";

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
  const userId = req.cookies
    ? req.cookies[userIdKey]
      ? req.cookies[userIdKey]
      : req.query.userId
    : "app";

  const storedState = req.cookies ? req.cookies[stateKey] : null;

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

      await storeUserSpotifyTokens({
        access_token,
        refresh_token,
        userId: userId,
      });

      if (process.env.APP_URL) {
        res.redirect(`${process.env.APP_URL}?spotifyAuth=true`);
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

import axios from "axios";
import qs from "qs";
import querystring from "querystring";
import { createClient } from "./redisClient";
import { SPOTIFY_ACCESS_TOKEN, SPOTIFY_REFRESH_TOKEN } from "./lib/constants";
import { Request, Response } from "express";

const client_id = process.env.CLIENT_ID; // Your client id
const client_secret = process.env.CLIENT_SECRET; // Your secret
const redirect_uri = process.env.REDIRECT_URI; // Your redirect uri

const stateKey = "spotify_auth_state";

function generateRandomString(length: number) {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

export function login(req: Request, res: Response) {
  const state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
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
      })
  );
}

export async function callback(req: Request, res: Response) {
  const code = req.query.code ?? null;
  const state = req.query.state ?? null;
  const storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect(
      "/#" +
        querystring.stringify({
          error: "state_mismatch",
        })
    );
  } else {
    res.clearCookie(stateKey);

    try {
      const { data } = await axios({
        method: "post",
        url: "https://accounts.spotify.com/api/token",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          Authorization:
            "Basic " +
            Buffer.from(client_id + ":" + client_secret).toString("base64"),
        },
        data: qs.stringify({
          code: code,
          redirect_uri: redirect_uri,
          grant_type: "authorization_code",
        }),
      });

      const { access_token, refresh_token } = data;

      const redisClient = await createClient();
      await redisClient.set(SPOTIFY_ACCESS_TOKEN, access_token);
      await redisClient.set(SPOTIFY_REFRESH_TOKEN, refresh_token);
      redisClient.disconnect();

      res.send({
        access_token: access_token,
      });
    } catch (e) {
      res.send({
        error: e,
      });
    }
  }
}

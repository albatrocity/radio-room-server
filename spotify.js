const axios = require("axios");
const qs = require("qs");
const querystring = require("querystring");
const { getClient } = require("./redisClient");

const client_id = process.env.CLIENT_ID; // Your client id
const client_secret = process.env.CLIENT_SECRET; // Your secret
const redirect_uri = process.env.REDIRECT_URI; // Your redirect uri

const stateKey = "spotify_auth_state";
const SPOTIFY_ACCESS_TOKEN = "spotifyAccessToken";
const SPOTIFY_REFRESH_TOKEN = "spotifyRefreshToken";

function generateRandomString(length) {
  var text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

function login(req, res) {
  console.log("LOGIN============");
  const state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  const scope =
    "user-read-private user-read-email playlist-read-collaborative playlist-modify-private playlist-modify-public user-read-playback-state user-modify-playback-state user-read-currently-playing";
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

async function callback(req, res) {
  // your application requests refresh and access tokens
  // after checking the state parameter
  console.log("CALLBACK");

  const code = req.query.code || null;
  const state = req.query.state || null;
  const storedState = req.cookies ? req.cookies[stateKey] : null;

  console.log("CODE", code);

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

      const { access_token, refresh_token, scope } = data;

      console.log("SCOPE====");
      console.log(scope);

      const redisClient = await getClient();

      await redisClient.set(SPOTIFY_ACCESS_TOKEN, access_token);
      await redisClient.set(SPOTIFY_REFRESH_TOKEN, refresh_token);
      res.send({
        access_token: access_token,
      });
    } catch (e) {
      console.log("e!", e);
      res.send({
        error: e,
      });
    }
  }
}

async function refreshToken(req, res) {
  // requesting access token from refresh token
  const client = await getClient();
  const refresh_token = await client.get(SPOTIFY_REFRESH_TOKEN);

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
      refresh_token,
      grant_type: "refresh_token",
    }),
  });
  await client.set(SPOTIFY_ACCESS_TOKEN, data.access_token);

  res.send({
    access_token: data.access_token,
  });
}

module.exports = {
  login,
  callback,
  refreshToken,
};

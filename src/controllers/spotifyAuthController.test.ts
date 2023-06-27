import { callback, login } from "./spotifyAuthController";
import * as httpMocks from "node-mocks-http";
import getSpotifyAuthTokens from "../operations/spotify/getSpotifyAuthTokens";
import { FORTY_FIVE_MINS, THREE_DAYS } from "../lib/constants";

jest.mock("../operations/spotify/getSpotifyAuthTokens");
jest.mock("../lib/updateUserAttributes");
jest.mock("../lib/generateRandomString", () => () => "RANDOM_STRING");

const mockSet = jest.fn();
const mockGet = jest.fn((key: string, cb: (err: any, reply: any) => void) => {
  cb(null, "1234");
});

// mock redisClient
jest.mock("../redisClient", () => ({
  createClient: () => ({
    get: mockGet,
    set: mockSet,
  }),
}));

const OLD_ENV = process.env;
beforeEach(() => {
  jest.resetModules(); // Most important - it clears the cache
  process.env = { ...OLD_ENV }; // Make a copy
});

afterAll(() => {
  process.env = OLD_ENV; // Restore old environment
});

describe("login", () => {
  it("redirects to spotify login", async () => {
    const request = httpMocks.createRequest({
      method: "GET",
      url: "/login",
    });

    const response = httpMocks.createResponse();

    await login(request, response);

    expect(response._getRedirectUrl()).toBe(
      `https://accounts.spotify.com/authorize?response_type=code&client_id=&scope=user-read-private%20user-read-email%20playlist-read-collaborative%20playlist-modify-private%20playlist-modify-public%20user-read-playback-state%20user-modify-playback-state%20user-read-currently-playing%20user-library-modify&redirect_uri=&state=RANDOM_STRING`
    );
  });

  it("uses limited spotify scope for guests", async () => {
    const request = httpMocks.createRequest({
      method: "GET",
      url: "/login",
      query: {
        userId: 1234,
      },
    });

    const response = httpMocks.createResponse();

    await login(request, response);

    expect(response._getRedirectUrl()).toBe(
      `https://accounts.spotify.com/authorize?response_type=code&client_id=&scope=playlist-read-collaborative%20playlist-read-private%20playlist-modify-private%20user-library-read&redirect_uri=&state=RANDOM_STRING&userId=1234`
    );
  });
});

describe("callback", () => {
  it("redirects on state mismatch", async () => {
    const request = httpMocks.createRequest({
      method: "GET",
      url: "/callback",
      query: {
        userId: 1234,
        state: "NEW_STATE",
      },
      cookies: {
        spotify_auth_state: "OLD_STATE",
      },
    });
    const response = httpMocks.createResponse();

    await callback(request, response);
    expect(response._getRedirectUrl()).toBe("/#error=state_mismatch");
  });

  it("gets token from Spotify", async () => {
    const request = httpMocks.createRequest({
      method: "GET",
      url: "/callback",
      query: {
        userId: 1234,
        state: "STATE",
        code: "SECRET_CODE",
      },
      cookies: {
        spotify_auth_state: "STATE",
      },
    });
    const response = httpMocks.createResponse();

    await callback(request, response);

    expect(getSpotifyAuthTokens).toHaveBeenCalledWith("SECRET_CODE");
  });

  it("updates Redis with tokens for guests", async () => {
    const request = httpMocks.createRequest({
      method: "GET",
      url: "/callback",
      query: {
        userId: "1234",
        state: "STATE",
        code: "SECRET_CODE",
      },
      cookies: {
        spotify_auth_state: "STATE",
      },
    });
    const response = httpMocks.createResponse();

    (getSpotifyAuthTokens as jest.Mock).mockResolvedValueOnce({
      access_token: "access_token",
      refresh_token: "refresh_token",
    });

    await callback(request, response);

    expect(mockSet).toHaveBeenCalledWith(
      "spotifyAccessToken:1234",
      "access_token",
      {
        PX: FORTY_FIVE_MINS,
      }
    );
    expect(mockSet).toHaveBeenCalledWith(
      "spotifyRefreshToken:1234",
      "refresh_token"
    );
  });

  it("updates REDIS with tokens for admin", async () => {
    const request = httpMocks.createRequest({
      method: "GET",
      url: "/callback",
      query: {
        state: "STATE",
        code: "SECRET_CODE",
      },
      cookies: {
        spotify_auth_state: "STATE",
      },
    });
    const response = httpMocks.createResponse();

    (getSpotifyAuthTokens as jest.Mock).mockResolvedValueOnce({
      access_token: "access_token",
      refresh_token: "refresh_token",
    });

    await callback(request, response);

    expect(mockSet).toHaveBeenCalledWith(
      "spotifyAccessToken:app",
      "access_token",
      { PX: FORTY_FIVE_MINS }
    );
    expect(mockSet).toHaveBeenCalledWith(
      "spotifyRefreshToken:app",
      "refresh_token",
      { PX: THREE_DAYS }
    );
  });

  it("redirects to APP_URL after auth", async () => {
    process.env.APP_URL = "https://www.listen.show";

    const request = httpMocks.createRequest({
      method: "GET",
      url: "/callback",
      query: {
        userId: 1234,
        state: "RANDOM_STRING",
        code: "SECRET_CODE",
      },
      cookies: {
        spotify_auth_state: "RANDOM_STRING",
      },
    });
    const response = httpMocks.createResponse();

    (getSpotifyAuthTokens as jest.Mock).mockResolvedValueOnce({
      access_token: "access_token",
      refresh_token: "refresh_token",
    });

    await callback(request, response);
    expect(response._getRedirectUrl()).toBe("https://www.listen.show");
  });
});

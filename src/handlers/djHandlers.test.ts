import { describe, test } from "@jest/globals";
import { makeSocket } from "../lib/testHelpers";
import {
  setDj,
  djDeputizeUser,
  queueSong,
  searchSpotifyTrack,
} from "./djHandlers";
import { setters, resetDataStores } from "../lib/dataStore";
import sendMessage from "../lib/sendMessage";
import spotifyApi from "../lib/spotifyApi";
import refreshSpotifyToken from "../operations/spotify/refreshSpotifyToken";

jest.mock("../lib/sendMessage");
jest.mock("../lib/spotifyApi", () => ({
  addToQueue: jest.fn(),
  searchTracks: jest.fn(() => ({
    data: {
      body: {
        tracks: [],
      },
    },
  })),
  setRefreshToken: jest.fn(),
}));
jest.mock("../operations/spotify/refreshSpotifyToken");
jest.mock("../operations/spotify/syncQueue");

afterEach(() => {
  jest.restoreAllMocks();
  resetDataStores();
});

describe("djHandlers", () => {
  const { socket, io, broadcastEmit, emit, toEmit } = makeSocket();

  describe("setDj", () => {
    test("sets isDj to true on user", async () => {
      setters.setUsers([{ userId: "1", username: "Homer" }]);
      const spy = jest.spyOn(setters, "setUsers");
      setDj({ socket, io }, "1");
      expect(spy).toHaveBeenCalledWith([
        { userId: "1", username: "Homer", isDj: true },
      ]);
    });

    test("emits USER_JOINED event when new DJ", async () => {
      setters.setUsers([{ userId: "1", username: "Homer" }]);
      setDj({ socket, io }, "1");
      expect(emit).toHaveBeenCalledWith("event", {
        type: "USER_JOINED",
        data: {
          user: { userId: "1", username: "Homer", isDj: true },
          users: [{ userId: "1", username: "Homer", isDj: true }],
        },
      });
    });

    test("sends system message on new DJ", async () => {
      setters.setUsers([{ userId: "1", username: "Homer" }]);
      setDj({ socket, io }, "1");
      expect(sendMessage).toHaveBeenCalledWith(io, {
        content: "Homer is now the DJ",
        meta: {
          userId: "1",
        },
        timestamp: expect.any(String),
        user: {
          id: "system",
          userId: "system",
          username: "system",
        },
      });
    });

    test("does not emit USER_JOINED event when user is already DJ", async () => {
      setters.setUsers([{ userId: "1", username: "Homer", isDj: true }]);
      setDj({ socket, io }, "1");
      expect(emit).not.toHaveBeenCalled();
    });

    test("unsets DJ", async () => {
      setters.setUsers([{ userId: "1", username: "Homer", isDj: true }]);
      setDj({ socket, io }, "1");
      expect(emit).not.toHaveBeenCalled();
    });

    test("unsets when no ID is passed", async () => {
      setters.setUsers([{ userId: "1", username: "Homer", isDj: true }]);
      setDj({ socket, io });
      expect(emit).toHaveBeenCalledWith("event", {
        type: "USER_JOINED",
        data: {
          users: [{ userId: "1", username: "Homer", isDj: false }],
        },
      });
    });
  });

  describe("djDeputizeUser", () => {
    test("sets deputyDjs", () => {
      setters.setUsers([{ userId: "1", username: "Homer" }]);
      const spy = jest.spyOn(setters, "setDeputyDjs");
      djDeputizeUser({ io }, "1");
      expect(spy).toHaveBeenCalledWith(["1"]);
    });

    test("removes from deputyDjs list if already in there", () => {
      setters.setUsers([{ userId: "1", username: "Homer", isDeputyDj: true }]);
      setters.setDeputyDjs(["1"]);
      const spy = jest.spyOn(setters, "setDeputyDjs");
      djDeputizeUser({ io }, "1");
      expect(spy).toHaveBeenCalledWith([]);
    });

    test("emits NEW_MESSAGE event to user", () => {
      setters.setUsers([{ userId: "1", username: "Homer", id: "1234-4567" }]);
      djDeputizeUser({ io }, "1");
      expect(toEmit).toHaveBeenCalledWith(
        "event",
        {
          type: "NEW_MESSAGE",
          data: {
            content:
              "You've been promoted to a deputy DJ. You may now add songs to the DJ's queue.",
            meta: {
              status: "info",
              type: "alert",
            },
            user: {
              id: "system",
              userId: "system",
              username: "system",
            },
            timestamp: expect.any(String),
          },
        },
        { status: "info" }
      );
    });

    test("emits START_DEPUTY_DJ_SESSION event to user", () => {
      setters.setUsers([{ userId: "1", username: "Homer", id: "1234-4567" }]);
      djDeputizeUser({ io }, "1");
      expect(toEmit).toHaveBeenCalledWith("event", {
        type: "START_DEPUTY_DJ_SESSION",
      });
    });

    test("emits END_DEPUTY_DJ_SESSION event to user if ending", () => {
      setters.setUsers([{ userId: "1", username: "Homer", id: "1234-4567" }]);
      setters.setDeputyDjs(["1"]);
      djDeputizeUser({ io }, "1");
      expect(toEmit).toHaveBeenCalledWith("event", {
        type: "END_DEPUTY_DJ_SESSION",
      });
    });

    test("emits USER_JOINED event", () => {
      setters.setUsers([{ userId: "1", username: "Homer", isDeputyDj: false }]);
      setters.setDeputyDjs([]);
      djDeputizeUser({ io }, "1");
      expect(emit).toHaveBeenCalledWith("event", {
        type: "USER_JOINED",
        data: {
          user: { userId: "1", username: "Homer", isDeputyDj: true },
          users: [{ userId: "1", username: "Homer", isDeputyDj: true }],
        },
      });
    });
  });

  describe("queueSong", () => {
    test("emits SONG_QUEUE_FAILURE event if current user already added it", async () => {
      socket.data.userId = "1";
      setters.setUsers([{ userId: "1", username: "Homer" }]);
      setters.setQueue([
        {
          uri: "uri",
          userId: "1",
          username: "Homer",
        },
      ]);

      await queueSong({ socket, io }, "uri");

      expect(emit).toHaveBeenCalledWith("event", {
        type: "SONG_QUEUE_FAILURE",
        data: {
          message: "You've already queued that song, please choose another",
        },
      });
    });

    test("emits SONG_QUEUE_FAILURE event if other user already queued song", async () => {
      socket.data.userId = "2";
      setters.setUsers([{ userId: "1", username: "Homer" }]);
      setters.setQueue([
        {
          uri: "uri",
          userId: "1",
          username: "Homer",
        },
      ]);

      await queueSong({ socket, io }, "uri");

      expect(emit).toHaveBeenCalledWith("event", {
        type: "SONG_QUEUE_FAILURE",
        data: {
          message:
            "Homer has already queued that song. Please try a different song.",
        },
      });
    });

    test("calls addToQueue", async () => {
      socket.data.userId = "1";
      setters.setUsers([{ userId: "1", username: "Homer" }]);
      await queueSong({ socket, io }, "uri");
      expect(spotifyApi.addToQueue).toHaveBeenCalledWith("uri");
    });

    test("adds with setQueue", async () => {
      socket.data.userId = "1";
      const spy = jest.spyOn(setters, "setQueue");

      setters.setUsers([{ userId: "1", username: "Homer" }]);

      (spotifyApi.addToQueue as jest.Mock).mockResolvedValueOnce({
        uri: "uri",
      });
      await queueSong({ socket, io }, "uri");
      expect(spy).toHaveBeenCalledWith([
        { uri: "uri", userId: "1", username: "Homer" },
      ]);
    });

    test("emits SONG_QUEUED event", async () => {
      socket.data.userId = "1";
      setters.setUsers([{ userId: "1", username: "Homer" }]);
      (spotifyApi.addToQueue as jest.Mock).mockResolvedValueOnce({
        uri: "uri",
      });

      await queueSong({ socket, io }, "uri");

      expect(emit).toHaveBeenCalledWith("event", {
        type: "SONG_QUEUED",
        data: {
          uri: "uri",
        },
      });
    });

    test("emits SONG_QUEUE_FAILURE event on error", async () => {
      socket.data.userId = "1";
      setters.setUsers([{ userId: "1", username: "Homer" }]);
      (spotifyApi.addToQueue as jest.Mock).mockRejectedValueOnce({
        uri: "uri",
      });

      await queueSong({ socket, io }, "uri");

      expect(emit).toHaveBeenCalledWith("event", {
        type: "SONG_QUEUE_FAILURE",
        data: {
          error: { uri: "uri" },
          message: "Song could not be queued",
        },
      });
    });

    test("calls sendMessage", async () => {
      socket.data.userId = "1";
      setters.setUsers([{ userId: "1", username: "Homer" }]);
      (spotifyApi.addToQueue as jest.Mock).mockResolvedValueOnce({
        uri: "uri",
      });

      await queueSong({ socket, io }, "uri");

      expect(sendMessage).toHaveBeenCalledWith(io, {
        content: "Homer added a song to the queue",
        timestamp: expect.any(String),
        user: {
          id: "system",
          userId: "system",
          username: "system",
        },
      });
    });
  });

  describe("searchSpotifyTrack", () => {
    test("calls searchTracks", async () => {
      (spotifyApi.searchTracks as jest.Mock).mockResolvedValueOnce({
        body: {
          tracks: [
            {
              name: "Cottoneye Joe",
              uri: "uri",
            },
          ],
        },
      });
      await searchSpotifyTrack(
        { socket, io },
        { query: "cottoneye joe", options: {} }
      );
      expect(spotifyApi.searchTracks).toHaveBeenCalledWith("cottoneye joe", {});
    });

    test("emits TRACK_SEARCH_RESULTS event", async () => {
      (spotifyApi.searchTracks as jest.Mock).mockResolvedValueOnce({
        body: {
          tracks: [
            {
              name: "Cottoneye Joe",
              uri: "uri",
            },
          ],
        },
      });
      await searchSpotifyTrack(
        { socket, io },
        { query: "cottoneye joe", options: {} }
      );
      expect(emit).toHaveBeenCalledWith("event", {
        type: "TRACK_SEARCH_RESULTS",
        data: [
          {
            name: "Cottoneye Joe",
            uri: "uri",
          },
        ],
      });
    });

    test("emits TRACK_SEARCH_RESULTS_FAILURE event on error", async () => {
      (spotifyApi.searchTracks as jest.Mock).mockRejectedValueOnce({});
      await searchSpotifyTrack(
        { socket, io },
        { query: "cottoneye joe", options: {} }
      );
      expect(emit).toHaveBeenCalledWith("event", {
        type: "TRACK_SEARCH_RESULTS_FAILURE",
        data: {
          error: {},
          message:
            "Something went wrong when trying to search for tracks. You might need to log in to Spotify's OAuth",
        },
      });
    });

    test("refreshes token on error", async () => {
      (spotifyApi.searchTracks as jest.Mock).mockRejectedValueOnce({});
      await searchSpotifyTrack(
        { socket, io },
        { query: "cottoneye joe", options: {} }
      );
      expect(refreshSpotifyToken).toHaveBeenCalled();
    });
  });
});

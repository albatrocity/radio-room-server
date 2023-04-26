import { describe, test } from "@jest/globals";
import { makeSocket } from "../lib/testHelpers";
import {
  setCover,
  getSettings,
  setPassword,
  kickUser,
  savePlaylist,
  settings,
  clearPlaylist,
} from "./adminHandlers";

import { getters, setters, resetDataStores } from "../lib/dataStore";
import sendMessage from "../lib/sendMessage";
import fetchAndSetMeta from "../operations/fetchAndSetMeta";
import getStation from "../operations/getStation";
import createAndPopulateSpotifyPlaylist from "../operations/createAndPopulateSpotifyPlaylist";

jest.mock("../lib/sendMessage");
jest.mock("../lib/spotifyApi");
jest.mock("../operations/fetchAndSetMeta");
jest.mock("../operations/createAndPopulateSpotifyPlaylist");
jest.mock("../operations/getStation");

afterEach(() => {
  jest.restoreAllMocks();
  resetDataStores();
});

describe("adminHandlers", () => {
  const { socket, io, broadcastEmit, emit, toEmit } = makeSocket();

  describe("setCover", () => {
    it("sets cover value", () => {
      const spy = jest.spyOn(setters, "setMeta");
      setCover({ socket, io }, "google.com");
      expect(spy).toHaveBeenCalledWith({ cover: "google.com" });
    });
  });

  describe("getCover", () => {
    it("gets settings", () => {
      const spy = jest.spyOn(getters, "getSettings");
      getSettings({ socket, io });
      expect(spy).toHaveBeenCalled();
    });

    it("emits SETTINGS event", () => {
      getSettings({ socket, io });
      expect(emit).toHaveBeenCalledWith("event", {
        type: "SETTINGS",
        data: {
          settings: {
            donationURL: undefined,
            extraInfo: undefined,
            fetchMeta: true,
            password: null,
          },
        },
      });
    });
  });

  describe("setPassword", () => {
    it("sets password", () => {
      const spy = jest.spyOn(setters, "setPassword");
      setPassword({ socket, io }, "donut");
      expect(spy).toHaveBeenCalled();
    });
  });

  describe("kickUser", () => {
    it("sends kicked event to kicked user", () => {
      setters.setUsers([{ userId: "1", username: "Homer" }]);
      // const spy = jest.spyOn(setters, "setUsers");
      kickUser({ socket, io }, { userId: "1", username: "Homer" });
      expect(toEmit).toHaveBeenCalledWith("event", {
        type: "KICKED",
      });
    });
    it("sends system message to kicked user", () => {
      setters.setUsers([{ userId: "1", username: "Homer" }]);
      // const spy = jest.spyOn(setters, "setUsers");
      kickUser({ socket, io }, { userId: "1", username: "Homer" });
      expect(toEmit).toHaveBeenCalledWith("event", {
        type: "NEW_MESSAGE",
        data: {
          content: "You have been kicked. I hope you deserved it.",
          meta: { status: "error", title: "Kicked", type: "alert" },
          timestamp: expect.any(String),
          user: { id: "system", userId: "system", username: "system" },
        },
      });
    });
  });

  describe("savePlaylist", () => {
    it("calls createAndPopulateSpotifyPlaylist", async () => {
      await savePlaylist(
        { socket, io },
        { name: "Hot Jams", uris: ["track1", "track2", "track3"] }
      );
      expect(createAndPopulateSpotifyPlaylist).toHaveBeenCalledWith(
        "Hot Jams",
        ["track1", "track2", "track3"]
      );
    });

    it("emits PLAYLIST_SAVED event on success", async () => {
      (createAndPopulateSpotifyPlaylist as jest.Mock).mockResolvedValueOnce({
        info: "Stuff from Spotify",
      });
      await savePlaylist(
        { socket, io },
        { name: "Hot Jams", uris: ["track1", "track2", "track3"] }
      );
      expect(emit).toHaveBeenCalledWith("event", {
        type: "PLAYLIST_SAVED",
        data: {
          info: "Stuff from Spotify",
        },
      });
    });

    it("emits SAVE_PLAYLIST_FAILED event on error", async () => {
      (createAndPopulateSpotifyPlaylist as jest.Mock).mockRejectedValueOnce({
        error: "Boo",
      });
      await savePlaylist(
        { socket, io },
        { name: "Hot Jams", uris: ["track1", "track2", "track3"] }
      );
      expect(emit).toHaveBeenCalledWith("event", {
        type: "SAVE_PLAYLIST_FAILED",
        error: {
          error: "Boo",
        },
      });
    });
  });

  describe("settings", () => {
    it("sets settings", async () => {
      const spy = jest.spyOn(setters, "setSettings");
      const newSettings = {
        extraInfo: "Heyyyyyy",
        fetchMeta: false,
        donationURL: undefined,
        password: null,
      };
      settings({ socket, io }, newSettings);
      expect(spy).toHaveBeenCalledWith(newSettings);
    });

    it("emits SETTINGS event", async () => {
      const newSettings = {
        extraInfo: "Heyyyyyy",
        fetchMeta: false,
        donationURL: undefined,
        password: null,
      };
      settings({ socket, io }, newSettings);
      expect(emit).toHaveBeenCalledWith("event", {
        type: "SETTINGS",
        data: newSettings,
      });
    });

    it("calls fetchAndSetMeta if fetchMeta is being turned on or off", async () => {
      (getStation as jest.Mock).mockResolvedValueOnce({
        bitrate: 1,
      });
      setters.setSettings({
        fetchMeta: false,
        extraInfo: undefined,
        donationURL: undefined,
        password: null,
      });
      const newSettings = {
        extraInfo: "Heyyyyyy",
        fetchMeta: true,
        donationURL: undefined,
        password: null,
      };
      await settings({ socket, io }, newSettings);
      expect(fetchAndSetMeta).toHaveBeenCalledWith(
        { io },
        {
          bitrate: 1,
        },
        undefined,
        { silent: true }
      );
    });
  });

  describe("clearPlaylist", () => {
    test("sets playlist to empty array", () => {
      setters.setPlaylist([
        {
          text: "Track",
          album: "Good Album",
          artist: "Good Artist",
          track: "Good track",
          spotifyData: {
            artists: [],
          },
          timestamp: 1,
        },
      ]);
      const spy = jest.spyOn(setters, "setPlaylist");
      clearPlaylist({ socket, io });
      expect(spy).toHaveBeenCalledWith([]);
    });
  });
});

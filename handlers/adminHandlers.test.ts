import { describe, test } from "@jest/globals";
import { makeSocket } from "../lib/testHelpers";
import {
  getSettings,
  setPassword,
  kickUser,
  savePlaylist,
  settings,
  clearPlaylist,
  getTriggerEvents,
} from "./adminHandlers";

import { getters, setters, resetDataStores } from "../lib/dataStore";
import {
  defaultReactionTriggerEvents,
  defaultMessageTriggerEvents,
} from "../config/defaultTriggerActions";
import fetchAndSetMeta from "../operations/fetchAndSetMeta";
import getStation from "../operations/getStation";
import createAndPopulateSpotifyPlaylist from "../operations/spotify/createAndPopulateSpotifyPlaylist";

jest.mock("../lib/sendMessage");
jest.mock("../lib/spotifyApi");
jest.mock("../operations/fetchAndSetMeta");
jest.mock("../operations/spotify/createAndPopulateSpotifyPlaylist");
jest.mock("../operations/getStation");

afterEach(() => {
  jest.restoreAllMocks();
  resetDataStores();
});

describe("adminHandlers", () => {
  const { socket, io, emit, toEmit } = makeSocket();

  describe("changing artwork", () => {
    it("sets meta", () => {
      const spy = jest.spyOn(setters, "setMeta");
      settings(
        { socket, io },
        {
          artwork: "google.com",
          fetchMeta: true,
          extraInfo: undefined,
          password: null,
        }
      );
      expect(spy).toHaveBeenCalledWith({ artwork: "google.com" });
    });
    it("updates settings", () => {
      const spy = jest.spyOn(setters, "setSettings");
      settings(
        { socket, io },
        {
          artwork: "google.com",
          fetchMeta: true,
          extraInfo: undefined,
          password: null,
        }
      );
      expect(spy).toHaveBeenCalledWith({
        artwork: "google.com",
        extraInfo: undefined,
        fetchMeta: true,
        password: null,
      });
    });
  });

  describe("getArtwork", () => {
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
          extraInfo: undefined,
          fetchMeta: true,
          password: null,
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
        password: null,
      };
      settings({ socket, io }, newSettings);
      expect(spy).toHaveBeenCalledWith(newSettings);
    });

    it("emits SETTINGS event", async () => {
      const newSettings = {
        extraInfo: "Heyyyyyy",
        fetchMeta: false,
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
        password: null,
      });
      const newSettings = {
        extraInfo: "Heyyyyyy",
        fetchMeta: true,
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
    test("removes instances of track trigger actions from history", () => {
      setters.setTriggerEventHistory([
        {
          on: "reaction",
          subject: { id: "latest", type: "track" },
          target: { type: "track", id: "spotify:track:3d1bBXr6nU2TxD9wfMUJEc" },
          action: "sendMessage",
          meta: { messageTemplate: "hey" },
          timestamp:
            "Thu May 18 2023 11:49:22 GMT-0500 (Central Daylight Time)",
        },
        {
          on: "message",
          subject: { id: "latest", type: "track" },
          target: { type: "message", id: "2023-05-18T16:49:22.372Z" },
          action: "sendMessage",
          meta: { messageTemplate: "React" },
          timestamp:
            "Thu May 18 2023 11:49:25 GMT-0500 (Central Daylight Time)",
        },
      ]);
      const spy = jest.spyOn(setters, "setTriggerEventHistory");
      clearPlaylist({ socket, io });
      expect(spy).toHaveBeenCalledWith([
        {
          on: "message",
          subject: { id: "latest", type: "track" },
          target: { type: "message", id: "2023-05-18T16:49:22.372Z" },
          action: "sendMessage",
          meta: { messageTemplate: "React" },
          timestamp:
            "Thu May 18 2023 11:49:25 GMT-0500 (Central Daylight Time)",
        },
      ]);
    });
  });

  describe("get trigger events", () => {
    test("gets trigger events from data store ", () => {
      const reactionSpy = jest.spyOn(getters, "getReactionTriggerEvents");
      const messageSpy = jest.spyOn(getters, "getMessageTriggerEvents");
      getTriggerEvents({ socket, io });
      expect(reactionSpy).toHaveBeenCalled();
      expect(messageSpy).toHaveBeenCalled();
    });

    test("emits TRIGGER_EVENTS with current events", () => {
      getTriggerEvents({ socket, io });
      expect(emit).toHaveBeenCalledWith("event", {
        data: {
          reactions: defaultReactionTriggerEvents,
          messages: defaultMessageTriggerEvents,
        },
        type: "TRIGGER_EVENTS",
      });
    });
  });
});

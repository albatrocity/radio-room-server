import { describe } from "@jest/globals";
import { makeSocket } from "../lib/testHelpers";
import { setPassword, kickUser, settings } from "./adminHandlers";

import { findRoom, getUser, persistRoom } from "../operations/data";

jest.mock("../lib/sendMessage");
jest.mock("../lib/spotifyApi");
jest.mock("../operations/spotify/createAndPopulateSpotifyPlaylist");
jest.mock("../operations/getStation");
jest.mock("../operations/data");

afterEach(() => {
  jest.clearAllMocks();
});

describe("adminHandlers", () => {
  const { socket, io, emit, toEmit } = makeSocket();

  describe("changing artwork", () => {
    it("updates settings", async () => {
      (findRoom as jest.Mock).mockResolvedValueOnce({
        artwork: undefined,
      });
      await settings(
        { socket, io },
        {
          artwork: "google.com",
          fetchMeta: true,
          extraInfo: undefined,
          password: null,
          deputizeOnJoin: false,
          enableSpotifyLogin: false,
        }
      );
      expect(persistRoom).toHaveBeenCalledWith({
        artwork: "google.com",
        extraInfo: undefined,
        fetchMeta: true,
        password: null,
        deputizeOnJoin: false,
        enableSpotifyLogin: false,
      });
    });
  });

  describe("setPassword", () => {
    it("sets password", async () => {
      (findRoom as jest.Mock).mockResolvedValueOnce({
        password: undefined,
      });
      await setPassword({ socket, io }, "donut");
      expect(persistRoom).toHaveBeenCalledWith({
        password: "donut",
      });
    });
  });

  describe("kickUser", () => {
    it("sends kicked event to kicked user", async () => {
      (getUser as jest.Mock).mockResolvedValueOnce({
        userId: "1",
        username: "Homer",
        id: "1234-5678",
      });

      await kickUser({ socket, io }, { userId: "1", username: "Homer" });
      expect(toEmit).toHaveBeenCalledWith("event", {
        type: "KICKED",
      });
    });
    it("sends system message to kicked user", async () => {
      (getUser as jest.Mock).mockResolvedValueOnce({
        userId: "1",
        username: "Homer",
        id: "1234-5678",
      });
      await kickUser(
        { socket, io },
        { userId: "1", username: "Homer", id: "1234-5678" }
      );
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

  describe("settings", () => {
    it("sets settings", async () => {
      (findRoom as jest.Mock).mockResolvedValueOnce({});
      const newSettings = {
        extraInfo: "Heyyyyyy",
        fetchMeta: false,
        password: null,
        deputizeOnJoin: false,
        enableSpotifyLogin: false,
      };
      await settings({ socket, io }, newSettings);
      expect(persistRoom).toHaveBeenCalledWith(newSettings);
    });

    it("emits SETTINGS event", async () => {
      (findRoom as jest.Mock).mockResolvedValueOnce({});
      (persistRoom as jest.Mock).mockResolvedValueOnce({});
      const newSettings = {
        extraInfo: "Heyyyyyy",
        fetchMeta: false,
        password: null,
        deputizeOnJoin: false,
        enableSpotifyLogin: false,
      };
      await settings({ socket, io }, newSettings);
      expect(toEmit).toHaveBeenCalledWith("event", {
        type: "SETTINGS",
        data: newSettings,
      });
    });
  });
});

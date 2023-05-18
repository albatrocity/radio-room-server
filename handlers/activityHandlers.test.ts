import { describe, test } from "@jest/globals";
import { makeSocket } from "../lib/testHelpers";
import {
  startListening,
  stopListening,
  addReaction,
  removeReaction,
} from "./activityHandlers";
import { setters, resetDataStores } from "../lib/dataStore";

jest.mock("../lib/sendMessage");
jest.mock("../operations/performTriggerAction");

afterEach(() => {
  jest.restoreAllMocks();
  resetDataStores();
});

describe("activityHandlers", () => {
  const { socket, io, broadcastEmit, emit } = makeSocket();

  describe("startListening", () => {
    test("broadcasts USER_JOINED event", async () => {
      socket.data.userId = "1";
      socket.data.username = "Homer";
      setters.setUsers([
        {
          userId: "1",
          username: "Homer",
        },
      ]);

      startListening({ socket, io });
      expect(emit).toHaveBeenCalledWith("event", {
        type: "USER_JOINED",
        data: {
          user: {
            status: "listening",
            userId: "1",
            username: "Homer",
          },
          users: [
            {
              status: "listening",
              userId: "1",
              username: "Homer",
            },
          ],
        },
      });
    });

    test("calls setUsers with new users", async () => {
      socket.data.userId = "1";
      socket.data.username = "Homer";
      setters.setUsers([
        {
          userId: "1",
          username: "Homer",
        },
      ]);
      const spy = jest.spyOn(setters, "setUsers");

      startListening({ socket, io });
      expect(spy).toHaveBeenCalledWith([
        { status: "listening", userId: "1", username: "Homer" },
      ]);
    });
  });

  describe("stopListening", () => {
    test("broadcasts USER_JOINED event", async () => {
      socket.data.userId = "1";
      socket.data.username = "Homer";
      setters.setUsers([
        {
          userId: "1",
          username: "Homer",
        },
      ]);

      stopListening({ socket, io });
      expect(emit).toHaveBeenCalledWith("event", {
        type: "USER_JOINED",
        data: {
          user: {
            status: "participating",
            userId: "1",
            username: "Homer",
          },
          users: [
            {
              status: "participating",
              userId: "1",
              username: "Homer",
            },
          ],
        },
      });
    });

    test("calls setUsers with new users", async () => {
      socket.data.userId = "1";
      socket.data.username = "Homer";
      setters.setUsers([
        {
          userId: "1",
          username: "Homer",
        },
      ]);
      const spy = jest.spyOn(setters, "setUsers");

      stopListening({ socket, io });
      expect(spy).toHaveBeenCalledWith([
        { status: "participating", userId: "1", username: "Homer" },
      ]);
    });
  });

  describe("addReaction", () => {
    it("sets reactions for messages", () => {
      setters.setReactions({
        message: {
          2: [{ emoji: ":-1:", user: "2" }],
        },
        track: {},
      });
      const spy = jest.spyOn(setters, "setReactions");

      addReaction(
        { socket, io },
        {
          emoji: {
            id: "thumbs up",
            name: "thumbs up",
            keywords: [],
            shortcodes: ":+1:",
          },
          reactTo: {
            type: "message",
            id: "2",
          },
          user: {
            userId: "1",
            username: "Homer",
          },
        }
      );
      expect(spy).toHaveBeenCalledWith({
        message: {
          "2": [
            { emoji: ":-1:", user: "2" },
            { emoji: ":+1:", user: "1" },
          ],
        },
        track: {},
      });
    });

    it("sets reactions for tracks", () => {
      setters.setReactions({
        message: {},
        track: {
          2: [{ emoji: ":-1:", user: "2" }],
        },
      });
      const spy = jest.spyOn(setters, "setReactions");

      addReaction(
        { socket, io },
        {
          emoji: {
            id: "thumbs up",
            name: "thumbs up",
            keywords: [],
            shortcodes: ":+1:",
          },
          reactTo: {
            type: "track",
            id: "2",
          },
          user: {
            userId: "1",
            username: "Homer",
          },
        }
      );
      expect(spy).toHaveBeenCalledWith({
        message: {},
        track: {
          "2": [
            { emoji: ":-1:", user: "2" },
            { emoji: ":+1:", user: "1" },
          ],
        },
      });
    });

    it("emits a REACTIONS event", () => {
      addReaction(
        { socket, io },
        {
          emoji: {
            id: "thumbs up",
            name: "thumbs up",
            keywords: [],
            shortcodes: ":+1:",
          },
          reactTo: {
            type: "track",
            id: "2",
          },
          user: {
            userId: "1",
            username: "Homer",
          },
        }
      );
      expect(emit).toHaveBeenCalledWith("event", {
        type: "REACTIONS",
        data: {
          reactions: {
            message: {},
            track: {
              "2": [{ emoji: ":+1:", user: "1" }],
            },
          },
        },
      });
    });
  });

  describe("removeReaction", () => {
    it("sets reactions for messages", () => {
      setters.setReactions({
        message: {
          2: [{ emoji: ":+1:", user: "1" }],
        },
        track: {},
      });
      const spy = jest.spyOn(setters, "setReactions");

      removeReaction(
        { socket, io },
        {
          emoji: {
            id: "thumbs up",
            name: "thumbs up",
            keywords: [],
            shortcodes: ":+1:",
          },
          reactTo: {
            type: "message",
            id: "2",
          },
          user: {
            userId: "1",
            username: "Homer",
          },
        }
      );
      expect(spy).toHaveBeenCalledWith({
        message: {
          "2": [],
        },
        track: {},
      });
    });

    it("sets reactions for tracks", () => {
      setters.setReactions({
        message: {},
        track: {
          2: [{ emoji: ":+1:", user: "1" }],
        },
      });
      const spy = jest.spyOn(setters, "setReactions");

      removeReaction(
        { socket, io },
        {
          emoji: {
            id: "thumbs up",
            name: "thumbs up",
            keywords: [],
            shortcodes: ":+1:",
          },
          reactTo: {
            type: "track",
            id: "2",
          },
          user: {
            userId: "1",
            username: "Homer",
          },
        }
      );
      expect(spy).toHaveBeenCalledWith({
        message: {},
        track: {
          "2": [],
        },
      });
    });

    it("emits a REACTIONS event", () => {
      removeReaction(
        { socket, io },
        {
          emoji: {
            id: "thumbs up",
            name: "thumbs up",
            keywords: [],
            shortcodes: ":+1:",
          },
          reactTo: {
            type: "track",
            id: "2",
          },
          user: {
            userId: "1",
            username: "Homer",
          },
        }
      );
      expect(emit).toHaveBeenCalledWith("event", {
        type: "REACTIONS",
        data: {
          reactions: {
            message: {},
            track: {
              2: [],
            },
          },
        },
      });
    });
  });
});

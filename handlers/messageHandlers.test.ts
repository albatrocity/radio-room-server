import { describe, test } from "@jest/globals";
import { makeSocket } from "../lib/testHelpers";
import {
  clearMessages,
  newMessage,
  startTyping,
  stopTyping,
} from "./messageHandlers";
import { getters, setters, resetDataStores } from "../lib/dataStore";
import sendMessage from "../lib/sendMessage";

jest.mock("../lib/sendMessage");

afterEach(() => {
  jest.restoreAllMocks();
  resetDataStores();
});

describe("messageHandlers", () => {
  const { socket, io, broadcastEmit, emit } = makeSocket();

  describe("clearMessages", () => {
    test("clears messages", () => {
      const spy = jest.spyOn(setters, "setMessages");

      clearMessages({ socket, io });
      expect(spy).toHaveBeenCalledWith([]);
    });

    test("emits SET_MESSAGES event", () => {
      clearMessages({ socket, io });
      expect(emit).toHaveBeenCalledWith("event", {
        type: "SET_MESSAGES",
        data: {
          messages: [],
        },
      });
    });
  });

  describe("newMessage", () => {
    test("sends message", () => {
      socket.data.userId = "1";
      socket.data.username = "Homer";

      newMessage({ socket, io }, "D'oh");

      expect(sendMessage).toHaveBeenCalledWith(io, {
        content: "D'oh",
        mentions: [],
        timestamp: expect.any(String),
        user: { userId: "1", username: "Homer" },
      });
    });

    test("emits TYPING event to clear message user", () => {
      setters.setTyping([{ userId: "1", username: "Homer" }]);
      socket.data.userId = "1";

      newMessage({ socket, io }, "");

      expect(emit).toHaveBeenCalledWith("event", {
        type: "TYPING",
        data: {
          typing: [],
        },
      });
    });
  });

  describe("startTyping", () => {
    test("sets typing", () => {
      setters.setUsers([{ userId: "1", username: "Homer" }]);
      socket.data.userId = "1";
      socket.data.username = "Homer";

      const spy = jest.spyOn(setters, "setTyping");

      startTyping({ socket, io });
      expect(spy).toHaveBeenCalledWith([{ userId: "1", username: "Homer" }]);
    });

    test("broadcasts TYPING event", () => {
      setters.setUsers([{ userId: "1", username: "Homer" }]);
      socket.data.userId = "1";
      socket.data.username = "Homer";

      startTyping({ socket, io });

      expect(broadcastEmit).toHaveBeenCalledWith("event", {
        type: "TYPING",
        data: {
          typing: [{ userId: "1", username: "Homer" }],
        },
      });
    });
  });

  describe("stopTyping", () => {
    test("sets typing", () => {
      setters.setUsers([{ userId: "1", username: "Homer" }]);
      setters.setTyping([{ userId: "1", username: "Homer" }]);
      socket.data.userId = "1";
      socket.data.username = "Homer";

      const spy = jest.spyOn(setters, "setTyping");

      stopTyping({ socket, io });
      expect(spy).toHaveBeenCalledWith([]);
    });

    test("broadcasts TYPING event", () => {
      setters.setUsers([{ userId: "1", username: "Homer" }]);
      setters.setTyping([{ userId: "1", username: "Homer" }]);
      socket.data.userId = "1";
      socket.data.username = "Homer";

      stopTyping({ socket, io });

      expect(broadcastEmit).toHaveBeenCalledWith("event", {
        type: "TYPING",
        data: {
          typing: [],
        },
      });
    });
  });
});

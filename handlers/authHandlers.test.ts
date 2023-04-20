import { describe, test } from "@jest/globals";
import { makeSocket } from "../lib/testHelpers";
import { login, changeUsername, disconnect } from "./authHandlers";
import {
  getters,
  setters,
  resetDataStores,
  defaultSettings,
} from "../lib/dataStore";
import sendMessage from "../lib/sendMessage";

jest.mock("../lib/sendMessage");

afterEach(() => {
  jest.restoreAllMocks();
  resetDataStores();
});

describe("authHandlers", () => {
  const { socket, io, broadcastEmit, emit } = makeSocket();

  describe("login", () => {
    test("broadcasts USER JOINED event", async () => {
      login({ socket, io }, { username: "Homer", userId: "123" });

      expect(broadcastEmit).toHaveBeenCalledWith("event", {
        data: {
          user: {
            connectedAt: expect.any(String),
            id: undefined,
            isDeputyDj: false,
            isDj: false,
            status: "participating",
            userId: "123",
            username: "Homer",
          },
          users: [
            {
              connectedAt: expect.any(String),
              id: undefined,
              isDeputyDj: false,
              isDj: false,
              status: "participating",
              userId: "123",
              username: "Homer",
            },
          ],
        },
        type: "USER_JOINED",
      });
    });

    test("emits INIT event to socket", async () => {
      login({ socket, io }, { username: "Homer", userId: "123" });

      expect(emit).toHaveBeenCalledWith("event", {
        data: {
          currentUser: {
            isDeputyDj: false,
            status: "participating",
            userId: "123",
            username: "Homer",
          },
          messages: [],
          meta: {},
          playlist: [],
          reactions: {
            message: {},
            track: {},
          },
          users: [
            {
              connectedAt: expect.any(String),
              id: undefined,
              isDeputyDj: false,
              isDj: false,
              status: "participating",
              userId: "123",
              username: "Homer",
            },
          ],
        },
        type: "INIT",
      });
    });

    test("calls setUsers", async () => {
      const spy = jest.spyOn(setters, "setUsers");

      login({ socket, io }, { username: "Homer", userId: "123" });

      expect(spy).toHaveBeenCalledWith([
        {
          connectedAt: expect.any(String),
          id: undefined,
          isDeputyDj: false,
          isDj: false,
          status: "participating",
          userId: "123",
          username: "Homer",
        },
      ]);
    });

    test("sets socket data props", async () => {
      login({ socket, io }, { username: "Homer", userId: "123" });

      expect(socket.data.userId).toEqual("123");
      expect(socket.data.username).toEqual("Homer");
    });
  });

  describe("changeUsername", () => {
    test("calls setUsers with new username", () => {
      setters.setUsers([
        { userId: "1", username: "Homer" },
        { userId: "2", username: "Bart" },
      ]);
      const spy = jest.spyOn(setters, "setUsers");

      changeUsername({ socket, io }, { userId: "1", username: "Marge" });
      expect(spy).toHaveBeenCalledWith([
        {
          userId: "1",
          username: "Marge",
        },
        {
          userId: "2",
          username: "Bart",
        },
      ]);
    });

    test("sends system message announcing change", () => {
      setters.setUsers([{ userId: "1", username: "Homer" }]);

      changeUsername({ socket, io }, { userId: "1", username: "Marge" });
      expect(sendMessage).toHaveBeenCalledWith(io, {
        content: "Homer transformed into Marge",
        meta: { oldUsername: "Homer", userId: "1" },
        timestamp: expect.any(String),
        user: {
          id: "system",
          userId: "system",
          username: "system",
        },
      });
    });

    test("emits a USER_JOINED event", () => {
      setters.setUsers([{ userId: "1", username: "Homer" }]);

      changeUsername({ socket, io }, { userId: "1", username: "Marge" });
      expect(emit).toHaveBeenCalledWith("event", {
        data: {
          user: { userId: "1", username: "Marge" },
          users: [{ userId: "1", username: "Marge" }],
        },
        type: "USER_JOINED",
      });
    });
  });

  describe("disconnect", () => {
    it("removes user from users list", () => {
      setters.setUsers([
        { userId: "1", username: "Homer" },
        { userId: "2", username: "Bart" },
      ]);
      socket.data.userId = "1";
      socket.data.username = "Homer";
      const spy = jest.spyOn(setters, "setUsers");

      disconnect({ socket, io });
      expect(spy).toHaveBeenCalledWith([{ userId: "2", username: "Bart" }]);
    });

    it("broadcasts new users list", () => {
      setters.setUsers([
        { userId: "1", username: "Homer" },
        { userId: "2", username: "Bart" },
      ]);
      socket.data.userId = "1";
      socket.data.username = "Homer";
      const spy = jest.spyOn(setters, "setUsers");

      disconnect({ socket, io });

      expect(broadcastEmit).toHaveBeenCalledWith("event", {
        type: "USER_LEFT",
        data: {
          user: { username: "Homer" },
          users: [{ userId: "2", username: "Bart" }],
        },
      });
    });

    it("resets settings if dj leaves", () => {
      setters.setUsers([
        { userId: "1", username: "Homer", isDj: true },
        { userId: "2", username: "Bart" },
      ]);
      socket.data.userId = "1";
      socket.data.username = "Homer";
      const spy = jest.spyOn(setters, "setSettings");

      disconnect({ socket, io });

      expect(spy).toHaveBeenCalledWith(defaultSettings);
    });
  });
});

import { describe, test } from "@jest/globals";
import { makeSocket } from "../lib/testHelpers";
import {
  login,
  changeUsername,
  disconnect,
  getUserSpotifyAuth,
} from "./authHandlers";
import sendMessage from "../lib/sendMessage";
import getStoredUserSpotifyTokens from "../operations/spotify/getStoredUserSpotifyTokens";
import {
  addOnlineUser,
  deleteUser,
  findRoom,
  getAllRoomReactions,
  getMessages,
  getRoomCurrent,
  getRoomPlaylist,
  getRoomUsers,
  getUser,
  isDj,
  saveUser,
  removeOnlineUser,
  updateUserAttributes,
} from "../operations/data";
import { pubUserJoined } from "../operations/sockets/users";

jest.mock("../lib/sendMessage");
jest.mock("../operations/spotify/getStoredUserSpotifyTokens");
jest.mock("../operations/spotify/removeStoredUserSpotifyTokens");
jest.mock("../operations/sockets/users");
jest.mock("../operations/data");

afterEach(() => {
  jest.clearAllMocks();
});

const stubbedMessages = [
  {
    content: "Hello",
    meta: {},
    timestamp: "2021-01-01T00:00:00.000Z",
    user: {
      id: "123",
      userId: "123",
      username: "Homer",
    },
  },
];

const stubbedMeta = {
  id: "123",
  name: "track123",
  artists: [],
  album: {
    id: "123",
    name: "album123",
    images: [],
  },
};

function setupTest({ userIsDj = false } = {}) {
  (getRoomUsers as jest.Mock).mockResolvedValueOnce([
    {
      connectedAt: "2021-01-01T00:00:00.000Z",
      id: undefined,
      isDeputyDj: false,
      isDj: false,
      status: "participating",
      userId: "123",
      username: "Homer",
    },
  ]);

  (findRoom as jest.Mock).mockResolvedValueOnce({
    id: "authRoom",
    name: "authRoom",
    creator: "roomCreator",
  });

  (getMessages as jest.Mock).mockResolvedValueOnce(stubbedMessages);
  (getRoomPlaylist as jest.Mock).mockResolvedValueOnce([]);
  (getRoomCurrent as jest.Mock).mockResolvedValueOnce(stubbedMeta);

  (getAllRoomReactions as jest.Mock).mockResolvedValueOnce({
    message: {},
    track: {},
  });

  (isDj as jest.Mock).mockResolvedValueOnce(userIsDj);
}

function setupUsernameTest({ newUsername = "Bart" } = {}) {
  (getUser as jest.Mock).mockResolvedValueOnce({
    id: "1",
    userId: "123",
    username: "Marge",
  });

  (updateUserAttributes as jest.Mock).mockResolvedValueOnce({
    users: [
      {
        id: "1",
        userId: "123",
        username: newUsername,
      },
    ],
    user: {
      id: "1",
      userId: "123",
      username: newUsername,
    },
  });
}

function setupDisconnectTest() {
  (removeOnlineUser as jest.Mock).mockResolvedValueOnce(null);
  (deleteUser as jest.Mock).mockResolvedValueOnce(null);
  (getRoomUsers as jest.Mock).mockResolvedValueOnce([]);
}

describe("authHandlers", () => {
  const { socket, io, emit, toEmit, join, broadcastEmit, toBroadcast } =
    makeSocket({
      roomId: "authRoom",
      id: "socket1",
      userId: "123",
      username: "Homer",
    });

  describe("login", () => {
    test.only("joins room", async () => {
      setupTest();
      await login(
        { socket, io },
        { username: "Homer", userId: "123", roomId: "authRoom" }
      );
      expect(join).toHaveBeenCalledWith("/rooms/authRoom");
    });

    test("calls pubUserJoined", async () => {
      setupTest();
      await login(
        { socket, io },
        { username: "Homer", userId: "123", roomId: "authRoom" }
      );

      expect(pubUserJoined).toHaveBeenCalledWith({ io }, "authRoom", {
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
      });
    });

    test("emits INIT event to socket", async () => {
      setupTest();
      await login(
        { socket, io },
        { username: "Homer", userId: "123", roomId: "authRoom" }
      );

      expect(emit).toHaveBeenCalledWith("event", {
        data: {
          currentUser: {
            isDeputyDj: false,
            status: "participating",
            userId: "123",
            username: "Homer",
            isAdmin: false,
          },
          messages: stubbedMessages,
          meta: stubbedMeta,
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

    test("sends isAdmin: true to room creator", async () => {
      setupTest();
      await login(
        { socket, io },
        { username: "Bart", userId: "roomCreator", roomId: "authRoom" }
      );

      expect(emit).toHaveBeenCalledWith("event", {
        data: {
          currentUser: {
            isDeputyDj: false,
            status: "participating",
            userId: "roomCreator",
            username: "Bart",
            isAdmin: true,
          },
          messages: stubbedMessages,
          meta: stubbedMeta,
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
            {
              username: "Bart",
              userId: "roomCreator",
              id: undefined,
              isDj: false,
              isDeputyDj: false,
              status: "participating",
              connectedAt: expect.any(String),
            },
          ],
        },
        type: "INIT",
      });
    });

    test("calls addOnlineUser", async () => {
      setupTest();

      await login(
        { socket, io },
        { username: "Homer", userId: "123", roomId: "authRoom" }
      );

      expect(addOnlineUser).toHaveBeenCalledWith("authRoom", "123");
    });

    test("calls persistUser", async () => {
      setupTest();

      await login(
        { socket, io },
        { username: "Homer", userId: "123", roomId: "authRoom" }
      );

      expect(saveUser).toHaveBeenCalledWith("123", {
        connectedAt: expect.any(String),
        id: undefined,
        isDeputyDj: false,
        isDj: false,
        status: "participating",
        userId: "123",
        username: "Homer",
      });
    });

    test("sets socket data props", async () => {
      setupTest();
      await login(
        { socket, io },
        { username: "Homer", userId: "123", roomId: "authRoom" }
      );

      expect(socket.data.userId).toEqual("123");
      expect(socket.data.username).toEqual("Homer");
    });
  });

  describe("changeUsername", () => {
    test("calls updateUserAttributes with new username", async () => {
      setupUsernameTest();
      await changeUsername({ socket, io }, { userId: "1", username: "Marge" });
      expect(updateUserAttributes).toHaveBeenCalledWith(
        "1",
        {
          username: "Marge",
        },
        "authRoom"
      );
    });

    test("sends system message announcing change", async () => {
      setupUsernameTest();

      await changeUsername({ socket, io }, { userId: "1", username: "Homer" });

      expect(sendMessage).toHaveBeenCalledWith(io, "authRoom", {
        content: "Marge transformed into Homer",
        meta: { oldUsername: "Marge", userId: "1" },
        timestamp: expect.any(String),
        user: {
          id: "system",
          userId: "system",
          username: "system",
        },
      });
    });

    test("calls pubUserJoined", async () => {
      setupUsernameTest({ newUsername: "Homer" });
      await changeUsername({ socket, io }, { userId: "1", username: "Homer" });

      expect(pubUserJoined).toHaveBeenCalledWith({ io }, "authRoom", {
        user: { id: "1", userId: "123", username: "Homer" },
        users: [{ id: "1", userId: "123", username: "Homer" }],
      });
    });
  });

  describe("disconnect", () => {
    it("removes user from online users list", async () => {
      setupDisconnectTest();
      socket.data.userId = "1";
      socket.data.username = "Homer";

      await disconnect({ socket, io });
      expect(removeOnlineUser).toHaveBeenCalledWith("authRoom", "1");
    });

    it("deletes user from redis", async () => {
      setupDisconnectTest();
      socket.data.userId = "1";
      socket.data.username = "Homer";

      await disconnect({ socket, io });
      expect(deleteUser).toHaveBeenCalledWith("1");
    });

    it("broadcasts new users list", async () => {
      setupDisconnectTest();
      socket.data.userId = "1";
      socket.data.username = "Homer";

      await disconnect({ socket, io });

      expect(broadcastEmit).toHaveBeenCalledWith("event", {
        type: "USER_LEFT",
        data: {
          user: { username: "Homer" },
          users: [],
        },
      });
      expect(toBroadcast).toHaveBeenCalledWith("/rooms/authRoom");
    });
  });

  describe("getUserSpotifyAuth", () => {
    it("looks up spotify tokens for socket user", async () => {
      socket.data.userId = "1";
      socket.data.username = "Homer";
      (getStoredUserSpotifyTokens as jest.Mock).mockResolvedValueOnce({
        accessToken: "1234",
        refreshToken: "5678",
      });

      await getUserSpotifyAuth({ socket, io }, { userId: "1" });

      expect(getStoredUserSpotifyTokens).toHaveBeenCalledWith("1");
    });

    it("emits event with user spotify auth", async () => {
      socket.data.userId = "1";
      socket.data.username = "Homer";
      (getStoredUserSpotifyTokens as jest.Mock).mockResolvedValueOnce({
        accessToken: "1234",
        refreshToken: "5678",
      });

      await getUserSpotifyAuth({ socket, io }, { userId: "1" });

      expect(toEmit).toHaveBeenCalledWith("event", {
        data: {
          isAuthenticated: true,
        },
        type: "SPOTIFY_AUTHENTICATION_STATUS",
      });
    });

    it("sends false if no tokens found", async () => {
      socket.data.userId = "1";
      socket.data.username = "Homer";
      (getStoredUserSpotifyTokens as jest.Mock).mockResolvedValueOnce({
        accessToken: null,
        refreshToken: null,
      });

      await getUserSpotifyAuth({ socket, io }, { userId: "1" });

      expect(toEmit).toHaveBeenCalledWith("event", {
        data: {
          isAuthenticated: false,
        },
        type: "SPOTIFY_AUTHENTICATION_STATUS",
      });
    });
  });
});

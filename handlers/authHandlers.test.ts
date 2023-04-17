import { Server, Socket } from "socket.io";
const { createServer } = require("http");

import { describe, test } from "@jest/globals";
import { Getters, Setters } from "../types/DataStores";
import authHandlers from "./authHandlers";

const getters: Getters = {
	getCover: jest.fn(),
	getDefaultSettings: jest.fn(),
	getDeputyDjs: jest.fn(),
	getMessages: jest.fn(),
	getMeta: jest.fn(),
	getPlaylist: jest.fn(),
	getQueue: jest.fn(),
	getReactions: jest.fn(),
	getSettings: jest.fn(),
	getTyping: jest.fn(),
	getUsers: jest.fn(),
	getFetching: jest.fn(),
	getStation: jest.fn(),
};

const setters: Setters = {
	setDeputyDjs: jest.fn(),
	setMessages: jest.fn(),
	setMeta: jest.fn(),
	setPlaylist: jest.fn(),
	setQueue: jest.fn(),
	setReactions: jest.fn(),
	setSettings: jest.fn(),
	setTyping: jest.fn(),
	setUsers: jest.fn(),
	setCover: jest.fn(),
	setFetching: jest.fn(),
	setPassword: jest.fn(),
	setStation: jest.fn(),
};

// const socket = jest.fn() as unknown as Socket;
// const io = jest.fn() as unknown as Server;

describe("authHandlers", () => {
	let io: Server, serverSocket: Socket;

	beforeAll((done) => {
		const httpServer = createServer();
		io = new Server(httpServer);
		httpServer.listen(() => {
			const port = httpServer.address().port;
			io.on("connection", (socket) => {
				serverSocket = socket;
			});
		});
	});

	afterAll(() => {
		io.close();
	});

	test("adds 1 + 2 to equal 3", async () => {
		authHandlers(serverSocket, io, getters, setters);
		await serverSocket.emit("check password", "world");
		expect(serverSocket.emit).toHaveBeenCalledWith("event");
	});
});

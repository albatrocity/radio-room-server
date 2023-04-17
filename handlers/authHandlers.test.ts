import { describe, test } from "@jest/globals";
import { makeSocket } from "../lib/testHelpers";
import { login } from "./authHandlers";

describe("authHandlers", () => {
	const { socket, io, broadcastEmit } = makeSocket();
	describe("login", () => {
		test("broadcasts login event", async () => {
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
	});
});

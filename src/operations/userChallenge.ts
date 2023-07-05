import { FORTY_FIVE_MINS } from "../lib/constants";
import { pubClient } from "../lib/redisClients";

export async function checkUserChallenge({
  challenge,
  userId,
}: {
  challenge: string;
  userId: string;
}) {
  try {
    const solution = await pubClient.get(`challenge:${userId}`);
    if (solution !== challenge) {
      throw new Error("Unauthorized", { cause: "invalid challenge" });
    }
  } catch (e) {
    throw new Error("Unauthorized", { cause: "invalid challenge" });
  }
}

export async function storeUserChallenge({
  userId,
  challenge,
}: {
  userId: string;
  challenge: string;
}) {
  await pubClient.set(`challenge:${userId}`, challenge, {
    PX: FORTY_FIVE_MINS,
  });
}

export async function clearUserChallenge(userId: string) {
  await pubClient.del(`challenge:${userId}`);
}

import { pubClient } from "../../lib/redisClients";
import { ReactionPayload } from "../../types/Reaction";
import { ReactionSubject } from "../../types/ReactionSubject";

export async function addReaction(
  roomId: string,
  reaction: ReactionPayload,
  reactTo: ReactionSubject
) {
  try {
    const reactionString = JSON.stringify(reaction);
    const key = `room:${roomId}:reactions:${reactTo.type}:${reactTo.id}`;
    return pubClient.sAdd(key, reactionString);
  } catch (e) {
    console.log(
      "ERROR FROM data/reactions/addReaction",
      roomId,
      reaction,
      reactTo
    );
    console.error(e);
  }
}

export async function removeReaction(
  roomId: string,
  reaction: ReactionPayload,
  reactTo: ReactionSubject
) {
  try {
    const reactionString = JSON.stringify(reaction);

    const key = `room:${roomId}:reactions:${reactTo.type}:${reactTo.id}`;
    return pubClient.sRem(key, reactionString);
  } catch (e) {
    console.log(
      "ERROR FROM data/reactions/removeReaction",
      roomId,
      reaction,
      reactTo
    );
    console.error(e);
  }
}

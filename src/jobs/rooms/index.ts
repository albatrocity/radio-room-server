import { refreshSpotifyTokens } from "./refreshSpotifyTokens";
import { pubClient } from "../../lib/redisClients";

export default async function () {
  try {
    const roomIds = await pubClient.sMembers("rooms");
    await Promise.all(roomIds.map((id) => refreshSpotifyTokens(id)));
  } catch (e) {
    console.error(e);
  }
}

import { communicateNowPlaying } from "./nowPlaying";
import { client } from "./redis";

export default async function () {
  try {
    client.connect();
    const roomIds = await client.sMembers("rooms");
    await Promise.all(roomIds.map((id) => communicateNowPlaying(id)));
  } catch (e) {
    console.error(e);
  } finally {
    client.quit();
  }
}

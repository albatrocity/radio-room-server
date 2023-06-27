import { getters } from "../../lib/dataStore";
import refreshSpotifyToken from "./refreshSpotifyToken";

export default async function refreshAllSpotifyTokens() {
  console.log("refreshAllSpotifyTokens");
  const users = await getters.getUsers();
  const updates = [...users, { userId: "app" }].map(async (user) => {
    await refreshSpotifyToken(user.userId);
  });
  try {
    await Promise.all(updates);
  } catch (e) {
    console.log(e);
  } finally {
    console.log(
      `refreshAllSpotifyTokens attempted for ${updates.length} users`
    );
  }
}

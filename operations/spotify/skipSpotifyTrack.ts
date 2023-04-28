import { SpotifyEntity } from "../../types/SpotifyEntity";
import spotifyApi from "../../lib/spotifyApi";

async function skipSpotifyTrack() {
  try {
    const { body } = await spotifyApi.skipToNext();
    return body;
  } catch (e) {
    console.error(e);
    console.error("Skip track failed");
    return {};
  }
}

export default skipSpotifyTrack;

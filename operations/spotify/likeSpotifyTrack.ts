import { SpotifyEntity } from "../../types/SpotifyEntity";
import spotifyApi from "../../lib/spotifyApi";

async function likeSpotifyTrack(uri: SpotifyEntity["id"]) {
  try {
    const parsedUri = uri.replace("spotify:track:", "");
    const { body } = await spotifyApi.addToMySavedTracks([parsedUri]);
    return body;
  } catch (e) {
    console.error(e);
    console.error("Like track failed");
    return {};
  }
}

export default likeSpotifyTrack;

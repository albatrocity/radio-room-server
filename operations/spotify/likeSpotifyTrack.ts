import { SpotifyEntity } from "../../types/SpotifyEntity";
import spotifyApi from "../../lib/spotifyApi";

async function likeSpotifyTrack(uri: SpotifyEntity["uri"]) {
  const { body } = await spotifyApi.addToMySavedTracks([uri]);

  return body;
}

export default likeSpotifyTrack;

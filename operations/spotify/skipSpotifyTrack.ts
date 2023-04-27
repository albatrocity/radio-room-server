import { SpotifyEntity } from "../../types/SpotifyEntity";
import spotifyApi from "../../lib/spotifyApi";

async function skipSpotifyTrack() {
  const { body } = await spotifyApi.skipToNext();

  return body;
}

export default skipSpotifyTrack;

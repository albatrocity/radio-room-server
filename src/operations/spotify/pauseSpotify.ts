import { events } from "../../lib/eventEmitter";
import spotifyApi from "../../lib/spotifyApi";

async function pauseSpotify() {
  try {
    const {
      body: { is_playing },
    } = await spotifyApi.getMyCurrentPlaybackState();
    if (is_playing) {
      await spotifyApi.pause();
      events.emit("PLAYBACK_PAUSED");
    }
  } catch (e) {
    console.error(e);
    console.error("Pause failed");
    return {};
  }
}

export default pauseSpotify;

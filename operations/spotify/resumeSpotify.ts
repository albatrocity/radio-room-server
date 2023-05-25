import { events } from "../../lib/eventEmitter";
import spotifyApi from "../../lib/spotifyApi";

async function resumeSpotify() {
  try {
    const {
      body: { is_playing },
    } = await spotifyApi.getMyCurrentPlaybackState();
    if (!is_playing) {
      await spotifyApi.play();
      events.emit("PLAYBACK_RESUMED");
    }
  } catch (e) {
    console.error(e);
    console.error("Resume failed");
    return {};
  }
}

export default resumeSpotify;

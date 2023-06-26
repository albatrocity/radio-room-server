import spotifyApi from "../../lib/spotifyApi";
import { getters, setters } from "../../lib/dataStore";
import axios from "axios";
import { SpotifyTrack } from "../../types/SpotifyTrack";

const ENDPOINT = "https://api.spotify.com/v1/me/player/queue";

type QueueResponse = {
  currently_playing?: SpotifyTrack;
  queue: SpotifyTrack[];
};

export default async function syncQueue() {
  try {
    const accessToken = spotifyApi.getAccessToken();
    const { data }: { data: QueueResponse } = await axios.get(ENDPOINT, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const queuedUris = data.queue.map(({ uri }) => uri);
    const currentQueue = getters.getQueue();
    setters.setQueue(
      currentQueue.filter((t) => {
        return queuedUris.includes(t.uri);
      })
    );
    return getters.getQueue();
  } catch (e) {
    return getters.getQueue();
  }
}

import { getters } from "./dataStore";

export default function getMessageVariables() {
  const playlist = getters.getPlaylist();
  const nowPlaying = playlist[playlist.length - 1];
  return {
    currentTrack: { ...nowPlaying, title: nowPlaying?.track },
    nowPlaying: nowPlaying?.text,
    listenerCount: getters
      .getUsers()
      .filter(({ status }) => status == "listening").length,
    participantCount: getters
      .getUsers()
      .filter(({ status }) => status == "participating").length,
    userCount: getters.getUsers().length,
    playlistCount: playlist.length,
    queueCount: getters.getQueue().length,
  };
}

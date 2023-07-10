import { getRoomUsersCount, getRoomPlaylist } from "../operations/data";
import { getters } from "./dataStore";

export default async function getMessageVariables(roomId: string) {
  const userCount = await getRoomUsersCount(roomId);
  const playlist = await getRoomPlaylist(roomId);
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
    userCount: userCount,
    playlistCount: playlist.length,
    queueCount: getters.getQueue().length,
  };
}

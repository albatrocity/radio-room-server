import { find } from "lodash/fp";
import { Server } from "socket.io";

import { getters, setters } from "../lib/dataStore";
import { FetchMetaOptions } from "../types/FetchMetaOptions";
import { Station } from "../types/Station";

import systemMessage from "../lib/systemMessage";
import fetchReleaseInfo from "./fetchReleaseInfo";

export default async function fetchAndSetMeta(
  { io }: { io: Server },
  station?: Station,
  title?: string,
  options: FetchMetaOptions = {}
) {
  const { fetchMeta } = getters.getSettings();
  const silent = options.silent || false;
  if (!station) {
    setters.setFetching(false);
    io.emit("event", { type: "META", data: { meta: setters.setMeta({}) } });
    return;
  }
  // Lookup and emit track meta
  const info = (title || station.title || "").split("|");
  const sourceTrack = info[0];
  const sourceArtist = info[1];
  const sourceAlbum = info[2];
  const fallbackTrack = info[3];
  const fallbackArtist = info[4];
  const fallbackAlbum = info[5];
  setters.setFetching(false);

  const useSpotify = sourceArtist && sourceAlbum && fetchMeta;
  const track = sourceTrack || fallbackTrack;
  const artist = sourceArtist || fallbackArtist;
  const album = sourceAlbum || fallbackAlbum;

  const release = useSpotify
    ? await fetchReleaseInfo(`${track} ${artist} ${album}`)
    : {};

  const queuedTrack = getters
    .getQueue()
    .find(({ uri }) => uri === release?.uri);
  const newMeta = {
    ...station,
    artist,
    album,
    track,
    release,
    artwork: getters.getSettings().artwork,
    dj: queuedTrack?.userId
      ? { userId: queuedTrack.userId, username: queuedTrack.username }
      : null,
  };
  setters.setMeta(newMeta);
  const content = track
    ? `Up next: ${track}${artist ? ` - ${artist}` : ""}${
        album ? ` - ${album}` : ""
      }`
    : `Up next: ${album}`;

  const newMessage = systemMessage(content, {
    artist,
    album,
    track,
    release,
  });

  if (!silent) {
    io.emit("event", { type: "NEW_MESSAGE", data: newMessage });
    setters.setMessages([...getters.getMessages(), newMessage]);
  }
  const newPlaylist = setters.setPlaylist([
    ...getters.getPlaylist(),
    {
      text: `${track} - ${artist} - ${album}`,
      album,
      artist,
      track,
      spotifyData: release,
      timestamp: Date.now(),
      dj: find(
        queuedTrack ? { userId: queuedTrack.userId } : { isDj: true },
        getters.getUsers()
      ),
    },
  ]);
  setters.setFetching(false);
  io.emit("event", { type: "META", data: { meta: newMeta } });
  io.emit("event", { type: "PLAYLIST", data: newPlaylist });
  if (queuedTrack) {
    setters.setQueue(
      getters.getQueue().filter(({ uri }) => uri !== queuedTrack.uri)
    );
  }
}

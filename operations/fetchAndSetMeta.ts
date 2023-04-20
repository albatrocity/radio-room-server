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
  const silent = options.silent || false;
  if (!station) {
    setters.setFetching(false);
    io.emit("event", { type: "META", data: { meta: setters.setMeta({}) } });
    return;
  }
  // Lookup and emit track meta
  const info = (title || station.title || "").split("|");
  const track = info[0];
  const artist = info[1];
  const album = info[2];
  setters.setFetching(false);

  if (!artist && !album) {
    setters.setFetching(false);
    const newMeta = fetchAndSetMeta({ io }, { ...station });
    io.emit("event", { type: "META", data: { meta: newMeta } });
    return;
  }
  const release = getters.getSettings().fetchMeta
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
    cover: getters.getCover(),
    dj: queuedTrack?.userId
      ? { userId: queuedTrack.userId, username: queuedTrack.username }
      : null,
  };
  setters.setMeta(newMeta);
  const content = track
    ? `Up next: ${track} - ${artist} - ${album}`
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

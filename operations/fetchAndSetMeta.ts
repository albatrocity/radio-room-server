import { find } from "lodash/fp";
import { Server } from "socket.io";

import { Station } from "../types/Station";
import { FetchMetaOptions } from "../types/FetchMetaOptions";
import { Getters, Setters } from "../types/DataStores";

import fetchReleaseInfo from "./fetchReleaseInfo";
import systemMessage from "../lib/systemMessage";

export default async function fetchAndSetMeta(
  { getters, setters, io }: { getters: Getters; setters: Setters; io: Server },
  station?: Station,
  title?: string,
  options: FetchMetaOptions = {}
) {
  console.log("fetchMeta=====", getters.getSettings().fetchMeta);
  console.log("setMeta");
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
    const newMeta = fetchAndSetMeta({ getters, setters, io }, { ...station });
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

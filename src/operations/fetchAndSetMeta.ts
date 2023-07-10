import { Server } from "socket.io";

import { getters, setters } from "../lib/dataStore";
import { FetchMetaOptions } from "../types/FetchMetaOptions";
import { Station } from "../types/Station";

import systemMessage from "../lib/systemMessage";
import fetchReleaseInfo from "./fetchReleaseInfo";
import sendMessage from "../lib/sendMessage";
import { Room } from "../types/Room";
import {
  addTrackToRoomPlaylist,
  findRoom,
  getRoomPlaylist,
  getUser,
  removeFromQueue,
  setRoomFetching,
} from "./data";

export default async function fetchAndSetMeta(
  { io }: { io: Server },
  roomId: Room["id"],
  station?: Station,
  title?: string,
  options: FetchMetaOptions = {}
) {
  await setRoomFetching(roomId, true);
  const room = await findRoom(roomId);
  if (!room) {
    return null;
  }
  const silent = options.silent || false;
  if (!station) {
    await setRoomFetching(roomId, false);
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
  await setRoomFetching(roomId, false);

  const useSpotify = sourceArtist && sourceAlbum && room.fetchMeta;
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
    artwork: room.artwork,
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
    await sendMessage(io, newMessage, roomId);
  }

  const trackDj = queuedTrack?.userId
    ? await getUser(queuedTrack?.userId)
    : null;

  await addTrackToRoomPlaylist(roomId, {
    text: `${track} - ${artist} - ${album}`,
    album,
    artist,
    track,
    spotifyData: release,
    timestamp: Date.now(),
    dj: trackDj,
  });
  const playlist = await getRoomPlaylist(roomId);

  await setRoomFetching(roomId, false);
  io.emit("event", { type: "META", data: { meta: newMeta } });
  io.emit("event", { type: "PLAYLIST", data: playlist });
  if (queuedTrack) {
    await removeFromQueue(roomId, queuedTrack.uri);
  }
}

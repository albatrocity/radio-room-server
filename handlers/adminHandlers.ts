import { find, get } from "lodash/fp";

import systemMessage from "../lib/systemMessage";
import createAndPopulateSpotifyPlaylist from "../operations/spotify/createAndPopulateSpotifyPlaylist";
import fetchAndSetMeta from "../operations/fetchAndSetMeta";
import getStation from "../operations/getStation";

import { HandlerConnections } from "../types/HandlerConnections";
import { Settings } from "../types/Settings";
import { SpotifyEntity } from "../types/SpotifyEntity";
import { User } from "../types/User";

import { getters, setters } from "../lib/dataStore";

const streamURL = process.env.SERVER_URL;

function setArtwork({ io }: HandlerConnections, url?: string) {
  const newMeta = { ...getters.getMeta(), artwork: url };
  const meta = setters.setMeta(newMeta);
  io.emit("event", { type: "META", data: { meta } });
}

export function getSettings({ io }: HandlerConnections) {
  io.emit("event", {
    type: "SETTINGS",
    data: getters.getSettings(),
  });
}

export function getTriggerEvents({ io }: HandlerConnections) {
  io.emit("event", {
    type: "TRIGGER_EVENTS",
    data: {
      reactions: getters.getReactionTriggerEvents(),
      messages: getters.getMessageTriggerEvents(),
    },
  });
}

export function setPassword(connections: HandlerConnections, value: string) {
  setters.setPassword(value);
}

export function fixMeta({ io }: HandlerConnections, title?: string) {
  fetchAndSetMeta({ io }, getters.getMeta().station, title);
}

export function kickUser({ io }: HandlerConnections, user: User) {
  const { userId } = user;
  const socketId = get("id", find({ userId }, getters.getUsers()));

  const newMessage = systemMessage(
    `You have been kicked. I hope you deserved it.`,
    { status: "error", type: "alert", title: "Kicked" }
  );

  io.to(socketId).emit("event", { type: "NEW_MESSAGE", data: newMessage });
  io.to(socketId).emit("event", { type: "KICKED" });

  if (io.sockets.sockets.get(socketId)) {
    io.sockets.sockets.get(socketId)?.disconnect();
  }
}

export async function savePlaylist(
  { socket }: HandlerConnections,
  { name, uris }: { name: string; uris: SpotifyEntity["uri"][] }
) {
  try {
    const data = await createAndPopulateSpotifyPlaylist(name, uris);
    socket.emit("event", { type: "PLAYLIST_SAVED", data });
  } catch (error) {
    socket.emit("event", { type: "SAVE_PLAYLIST_FAILED", error });
  }
}

export async function settings(
  { socket, io }: HandlerConnections,
  values: Settings
) {
  const { extraInfo, fetchMeta, password, artwork } = values;
  console.log("ARTWORK!", artwork);
  const prevSettings = { ...getters.getSettings() };
  const newSettings = {
    fetchMeta,
    extraInfo,
    password,
    artwork,
  };
  setters.setSettings(newSettings);
  io.emit("event", { type: "SETTINGS", data: newSettings });

  if (prevSettings.extraInfo !== values.extraInfo) {
    setters.setSettings(newSettings);
  }

  if (prevSettings.artwork !== artwork) {
    setArtwork({ socket, io }, artwork);
  }

  if (prevSettings.fetchMeta !== values.fetchMeta) {
    const station = await getStation(`${streamURL}/stream?type=http&nocache=4`);
    await fetchAndSetMeta({ io }, station, get("title", station), {
      silent: true,
    });
  }
}

export function clearPlaylist({ socket, io }: HandlerConnections) {
  setters.setPlaylist([]);
  setters.setQueue([]);
  io.emit("event", { type: "PLAYLIST", data: [] });
}

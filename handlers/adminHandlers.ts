import { find, get } from "lodash/fp";

import systemMessage from "../lib/systemMessage";
import createAndPopulateSpotifyPlaylist from "../operations/createAndPopulateSpotifyPlaylist";
import fetchAndSetMeta from "../operations/fetchAndSetMeta";
import getStation from "../operations/getStation";

import { HandlerConnections } from "../types/HandlerConnections";
import { Settings } from "../types/Settings";
import { SpotifyEntity } from "../types/SpotifyEntity";
import { User } from "../types/User";

import { getters, setters } from "../lib/dataStore";

const { getUsers, getSettings: getSettingsData, getMeta } = getters;
const {
  setSettings,
  setMeta,
  setPassword: setPasswordData,
  setCover: setCoverData,
  setPlaylist,
  setQueue,
} = setters;

const streamURL = process.env.SERVER_URL;

export function setCover({ io }: HandlerConnections, url: string) {
  setCoverData(url);
  const newMeta = { ...getMeta(), cover: url };
  const meta = setMeta(newMeta);
  io.emit("event", { type: "META", data: { meta } });
}

export function getSettings({ io }: HandlerConnections) {
  io.emit("event", { type: "SETTINGS", data: { settings: getSettingsData() } });
}

export function setPassword(connections: HandlerConnections, value: string) {
  setPasswordData(value);
}

export function fixMeta({ io }: HandlerConnections, title?: string) {
  fetchAndSetMeta({ io }, getMeta().station, title);
}

export function kickUser({ io }: HandlerConnections, user: User) {
  const { userId } = user;
  const socketId = get("id", find({ userId }, getUsers()));

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
  const { donationURL, extraInfo, fetchMeta, password } = values;
  const prevSettings = { ...getSettingsData() };
  const newSettings = {
    fetchMeta,
    donationURL,
    extraInfo,
    password,
  };
  setSettings(newSettings);
  io.emit("event", { type: "SETTINGS", data: newSettings });

  if (
    prevSettings.donationURL !== values.donationURL ||
    prevSettings.extraInfo !== values.extraInfo
  ) {
    setSettings(newSettings);
  }

  if (!prevSettings.fetchMeta && values.fetchMeta) {
    const station = await getStation(`${streamURL}/stream?type=http&nocache=4`);
    await fetchAndSetMeta({ io }, station, get("title", station), {
      silent: true,
    });
  }
}

export function clearPlaylist({ socket, io }: HandlerConnections) {
  setPlaylist([]);
  setQueue([]);
  io.emit("event", { type: "PLAYLIST", data: [] });
}

import { find, get } from "lodash/fp";
import { Server, Socket } from "socket.io";

import createAndPopulateSpotifyPlaylist from "../operations/createAndPopulateSpotifyPlaylist";
import getStation from "../operations/getStation";
import fetchAndSetMeta from "../operations/fetchAndSetMeta";
import systemMessage from "../lib/systemMessage";

import { Getters, Setters } from "types/DataStores";

const streamURL = process.env.SERVER_URL;

function adminHandlers(
  socket: Socket,
  io: Server,
  getters: Getters,
  setters: Setters
) {
  const { getUsers, getSettings, getMeta } = getters;
  const {
    setSettings,
    setMeta,
    setPassword,
    setCover,
    setPlaylist,
    setQueue,
  } = setters;
  socket.on("set cover", (url) => {
    setCover(url);
    const newMeta = { ...getMeta(), cover: url };
    const meta = setMeta(newMeta);
    io.emit("event", { type: "META", data: { meta } });
  });

  socket.on("get settings", (url) => {
    io.emit("event", { type: "SETTINGS", data: { settings: getSettings() } });
  });

  socket.on("set password", (value) => {
    setPassword(value);
  });

  socket.on("fix meta", (title) => {
    fetchAndSetMeta({ getters, setters, io }, getMeta().station, title);
  });

  socket.on("kick user", (user) => {
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
  });

  socket.on("save playlist", async ({ name, uris }) => {
    try {
      const data = await createAndPopulateSpotifyPlaylist(name, uris);
      socket.emit("event", { type: "PLAYLIST_SAVED", data });
    } catch (error) {
      socket.emit("event", { type: "SAVE_PLAYLIST_FAILED", error });
    }
  });

  socket.on("settings", async (values) => {
    const { donationURL, extraInfo, fetchMeta, password } = values;
    const prevSettings = { ...getSettings() };
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
      const station = await getStation(
        `${streamURL}/stream?type=http&nocache=4`
      );
      await fetchAndSetMeta(
        { getters, setters, io },
        station,
        get("title", station),
        { silent: true }
      );
    }
  });

  socket.on("clear playlist", () => {
    setPlaylist([]);
    setQueue([]);
    io.emit("event", { type: "PLAYLIST", data: [] });
  });
}

export default adminHandlers;

const { find, get } = require("lodash/fp");
const streamURL = process.env.SERVER_URL;

const systemMessage = require("../lib/systemMessage");
const updateUserAttributes = require("../lib/updateUserAttributes");
const createAndPopulateSpotifyPlaylist = require("../operations/createAndPopulateSpotifyPlaylist");
const getStation = require("../lib/getStation");

module.exports = function djHandlers(
  socket,
  io,
  { getUsers, getSettings, getMeta },
  {
    setUsers,
    setSettings,
    setMeta,
    setPassword,
    setCover,
    setPlaylist,
    setQueue,
  },
  { fetchAndSetMeta }
) {
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
    fetchAndSetMeta(meta.station, title);
  });

  socket.on("kick user", (user) => {
    console.log("kick user", user);
    const { userId } = user;
    const socketId = get("id", find({ userId }, getUsers()));

    const newMessage = systemMessage(
      `You have been kicked. I hope you deserved it.`,
      { status: "error", type: "alert", title: "Kicked" }
    );

    io.to(socketId).emit("event", { type: "NEW_MESSAGE", data: newMessage });
    io.to(socketId).emit("event", { type: "KICKED" });

    if (io.sockets.sockets.get(socketId)) {
      io.sockets.sockets.get(socketId).disconnect();
    }
  });

  socket.on("save playlist", async ({ name, uris }) => {
    console.log("SAVE PLAYLIST", name);
    try {
      const data = await createAndPopulateSpotifyPlaylist(name, uris);
      socket.emit("event", { type: "PLAYLIST_SAVED", data });
    } catch (error) {
      console.log(error);
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
      const { user } = updateUserAttributes(
        socket.userId,
        {
          donationURL,
          extraInfo,
        },
        { getUsers, setUsers }
      );
      io.emit("event", {
        type: "USER_JOINED",
        data: {
          user,
          users: getUsers(),
        },
      });
    }

    if (!prevSettings.fetchMeta && values.fetchMeta) {
      console.log("fetchMeta turned on");
      const station = await getStation(
        `${streamURL}/stream?type=http&nocache=4`
      );
      await fetchAndSetMeta(station, get("title", station), { silent: true });
    }
  });

  socket.on("clear playlist", () => {
    setPlaylist([]);
    setQueue([]);
    io.emit("event", { type: "PLAYLIST", data: [] });
  });
};

const { find, concat, reject, map, uniqBy, get } = require("lodash/fp");

const systemMessage = require("../lib/systemMessage");
const sendMessage = require("../lib/sendMessage");
const updateUserAttributes = require("../lib/updateUserAttributes");
const spotifyApi = require("../lib/spotifyApi");
const refreshSpotifyToken = require("../lib/refreshSpotifyToken");

module.exports = function djHandlers(
  socket,
  io,
  { getUsers, getMessages, getSettings, getMeta, getDefaultSettings },
  { setUsers, setMessages, setSettings, setMeta }
) {
  socket.on("set cover", (url) => {
    cover = url;
    const newMeta = { ...getMeta(), cover: url };
    const meta = setMeta(newMeta);
    io.emit("event", { type: "META", data: { meta } });
  });

  socket.on("get settings", (url) => {
    io.emit("event", { type: "SETTINGS", data: { settings: getSettings() } });
  });
};

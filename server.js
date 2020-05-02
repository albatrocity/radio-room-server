const util = require("util");
const express = require("express");
const socketIO = require("socket.io");
const internetradio = require("node-internet-radio");
const fetchReleaseInfo = require("./lib/fetchReleaseInfo");
const parseMessage = require("./lib/parseMessage");
const PORT = process.env.PORT || 3000;
const INDEX = "/index.html";
const { reject, find, takeRight, concat, uniq, compact } = require("lodash/fp");

const streamURL = process.env.SERVER_URL;
const getStation = util.promisify(internetradio.getStationInfo);

const server = express()
  .use((req, res) => res.sendFile(INDEX, { root: __dirname }))
  .listen(PORT, () => console.log(`Listening on ${PORT}`));

const io = socketIO(server, { origins: "*:*" });

let numUsers = 0;

let users = [];
let messages = [];
let typing = [];
let meta = {};
let fetching = false;

io.on("connection", socket => {
  var addedUser = false;

  socket.on("login", ({ username, userId }) => {
    socket.username = username;
    socket.userId = userId;
    const newUser = { username, userId, id: socket.id };
    users = users.concat(newUser);
    console.log("users", users);

    socket.broadcast.emit("user joined", {
      user: newUser,
      users
    });

    socket.emit("init", {
      users,
      messages,
      meta
    });
  });

  // when the client emits 'new message', this listens and executes
  socket.on("new message", data => {
    // we tell the client to execute 'new message'
    const { content, mentions } = parseMessage(data);
    const payload = {
      user: find({ id: socket.id }, users) || { username: socket.username },
      content,
      mentions,
      timestamp: new Date().toISOString()
    };
    messages = takeRight(10, [...messages, payload]);
    typing = compact(uniq(reject({ userId: socket.userId }, typing)));
    io.emit("typing", typing);
    io.emit("new message", payload);
  });

  socket.on("change username", ({ userId, username }) => {
    const user = find({ userId }, users);
    if (user) {
      const newUser = { username, userId, id: socket.id };
      users = concat(newUser, reject({ userId }, users));
      io.emit("user joined", {
        user: newUser,
        users
      });
    }
  });

  // when the client emits 'typing', we broadcast it to others
  socket.on("typing", () => {
    typing = compact(
      uniq(concat(typing, find({ userId: socket.userId }, users)))
    );
    io.emit("typing", typing);
  });

  // when the client emits 'stop typing', we broadcast it to others
  socket.on("stop typing", () => {
    typing = compact(uniq(reject({ userId: socket.userId }, typing)));
    io.emit("typing", typing);
  });

  // when the user disconnects.. perform this
  socket.on("disconnect", () => {
    console.log("Disconnect", socket.username, socket.id);
    console.log("socket.id", socket.id);
    users = users.filter(x => x.id !== socket.id);
    console.log(users);

    // echo globally that this client has left
    socket.broadcast.emit("user left", {
      user: { username: socket.username },
      users
    });
  });
});

setInterval(async () => {
  if (fetching) {
    return;
  }
  fetching = true;
  const station = await getStation(`${streamURL}/stream?type=http&nocache=4`);
  if (!station) {
    return;
  }
  if (station.title !== meta.title || station.bitrate !== meta.bitrate) {
    // Lookup and emit track meta
    const info = station.title.split("|");
    const track = info[0];
    const artist = info[1];
    const album = info[2];
    fetching = true;

    const release = await fetchReleaseInfo(`${artist} ${album}`);
    meta = { ...station, artist, album, track, release };
    const newMessage = {
      user: {
        username: "system",
        id: "system",
        userId: "system"
      },
      content: track
        ? `Up next: ${track} - ${artist} - ${album}`
        : `Up next: ${album}`,
      timestamp: new Date().toISOString(),
      meta: {
        artist,
        album,
        track,
        release
      }
    };
    io.emit("new message", newMessage);
    messages = concat(newMessage, messages);
    fetching = false;
    io.emit("meta", meta);
  }
  fetching = false;
}, 2000);

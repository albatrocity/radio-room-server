const util = require("util");
const express = require("express");
const socketIO = require("socket.io");
const fetchReleaseInfo = require("./lib/fetchReleaseInfo");
const parseMessage = require("./lib/parseMessage");
const systemMessage = require("./lib/systemMessage");
const radioMachine = require("./lib/machines/radioMachine");
const getStation = require("./lib/getStation");
const PORT = process.env.PORT || 3000;
const INDEX = "/index.html";
const {
  reject,
  find,
  takeRight,
  take,
  concat,
  map,
  uniq,
  uniqBy,
  compact,
  get
} = require("lodash/fp");
const { interpret } = require("xstate");

const service = interpret(radioMachine);

service.start();

const streamURL = process.env.SERVER_URL;

const server = express()
  .use((req, res) => res.sendFile(INDEX, { root: __dirname }))
  .listen(PORT, () => console.log(`Listening on ${PORT}`));

const io = socketIO(server, { origins: "*:*" });

let numUsers = 0;

const defaultSettings = {
  fetchMeta: true,
  extraInfo: undefined,
  donationURL: undefined
};

const reactionableTypes = ["message", "track"];

let users = [];
let messages = [];
let typing = [];
let meta = {};
let settings = { ...defaultSettings };
let cover = null;
let fetching = false;
let playlist = [];
let reactions = {
  message: {},
  track: {}
};

const updateUserAttributes = (userId, attributes) => {
  const user = find({ userId }, users);
  const newUser = { ...user, ...attributes };
  users = uniqBy("userId", concat(newUser, reject({ userId }, users)));
  return { users, user: newUser };
};

const sendMessage = message => {
  io.emit("event", { type: "NEW_MESSAGE", data: message });
  messages = take(60, concat(message, messages));
};

io.on("connection", socket => {
  console.log("CONNECTION");
  socket.on("login", ({ username, userId }) => {
    socket.username = username;
    socket.userId = userId;
    const newUser = {
      username,
      userId,
      id: socket.id,
      isDj: false,
      connectedAt: new Date().toISOString()
    };
    users = uniqBy("userId", users.concat(newUser));

    socket.broadcast.emit("event", {
      type: "USER_JOINED",
      data: {
        user: newUser,
        users
      }
    });

    console.log("user joined, init");
    socket.emit("event", {
      type: "INIT",
      data: {
        users,
        messages,
        meta: cover ? { ...meta, cover } : meta,
        playlist,
        reactions
      }
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
    typing = compact(uniq(reject({ userId: socket.userId }, typing)));
    io.emit("event", { type: "TYPING", data: typing });
    sendMessage(payload);
  });

  socket.on("change username", ({ userId, username }) => {
    const user = find({ userId }, users);
    const oldUsername = get("username", user);
    if (user) {
      const newUser = { ...user, username };
      users = uniqBy("userId", concat(newUser, reject({ userId }, users)));

      const content = `${oldUsername} transformed into ${username}`;
      const newMessage = systemMessage(content, {
        oldUsername,
        userId
      });
      io.emit("event", {
        type: "USER_JOINED",
        data: {
          user: newUser,
          users
        }
      });
      sendMessage(newMessage);
    }
  });

  socket.on("set DJ", userId => {
    const user = find({ userId }, users);
    if (user && user.isDj) {
      return;
    }
    if (userId && user) {
      const newUser = { ...user, isDj: true };
      users = uniqBy(
        "userId",
        concat(
          newUser,
          reject(
            { userId },
            map(x => ({ ...x, isDj: false }), users)
          )
        )
      );
      const content = `${user.username} is now the DJ`;
      const newMessage = systemMessage(content, {
        userId
      });
      sendMessage(newMessage);
      io.emit("event", {
        type: "USER_JOINED",
        data: {
          user: newUser,
          users
        }
      });
    } else {
      users = uniqBy(
        "userId",
        map(x => ({ ...x, isDj: false }), users)
      );
      const content = `There's currently no DJ.`;
      const newMessage = systemMessage(content, {
        userId
      });
      sendMessage(newMessage);
      io.emit("event", {
        type: "USER_JOINED",
        data: {
          users
        }
      });
    }
    settings = { ...defaultSettings };
    io.emit("event", { type: "SETTINGS", data: settings });
  });

  socket.on("fix meta", title => {
    setMeta(meta.station, title);
  });

  socket.on("set cover", url => {
    cover = url;
    meta = { ...meta, cover: url };
    io.emit("event", { type: "META", meta });
  });

  socket.on("get settings", url => {
    io.emit("event", { type: "SETTINGS", settings });
  });

  socket.on("add reaction", ({ emoji, reactTo, user }) => {
    if (reactionableTypes.indexOf(reactTo.type) === -1) {
      return;
    }
    reactions = {
      ...reactions,
      [reactTo.type]: {
        ...reactions[reactTo.type],
        [reactTo.id]: [
          ...takeRight(199, reactions[reactTo.type][reactTo.id] || []),
          { emoji: emoji.colons, user: user.userId }
        ]
      }
    };
    io.emit("event", { type: "REACTIONS", data: { reactions } });
  });

  socket.on("remove reaction", ({ emoji, reactTo, user }) => {
    if (reactionableTypes.indexOf(reactTo.type) === -1) {
      return;
    }

    reactions = {
      ...reactions,
      [reactTo.type]: {
        ...reactions[reactTo.type],
        [reactTo.id]: reject(
          { emoji: emoji.colons, user: user.userId },
          reactions[reactTo.type][reactTo.id] || []
        )
      }
    };
    io.emit("event", { type: "REACTIONS", data: { reactions } });
  });

  socket.on("kick user", user => {
    const { userId } = user;
    const socketId = get("id", find({ userId }, users));

    const newMessage = systemMessage(
      `Terribly sorry: you have been kicked. I hope you deserved it.`
    );

    io.to(socketId).emit(
      "message",
      { type: "NEW_MESSAGE", data: newMessage },
      { status: "critical" }
    );
    io.to(socketId).emit("event", { type: "KICKED" });
  });

  socket.on("clear playlist", () => {
    playlist = [];
    io.emit("event", { type: "PLAYLIST", data: playlist });
  });

  socket.on("settings", async values => {
    const { donationURL, extraInfo, fetchMeta } = values;
    const prevSettings = { ...settings };
    settings = {
      fetchMeta,
      donationURL,
      extraInfo
    };
    io.emit("event", { type: "SETTINGS", data: settings });

    if (
      prevSettings.donationURL !== values.donationURL ||
      prevSettings.extraInfo !== values.extraInfo
    ) {
      const { user } = updateUserAttributes(socket.userId, {
        donationURL,
        extraInfo
      });
      io.emit("event", {
        type: "USER_JOINED",
        data: {
          user,
          users
        }
      });
    }

    if (!prevSettings.fetchMeta && values.fetchMeta) {
      console.log("fetchMeta turned on");
      const station = await getStation(
        `${streamURL}/stream?type=http&nocache=4`
      );
      await setMeta(station, station.title, { silent: true });
    }
  });

  // when the client emits 'typing', we broadcast it to others
  socket.on("typing", () => {
    typing = compact(
      uniq(concat(typing, find({ userId: socket.userId }, users)))
    );
    socket.broadcast.emit("event", { type: "TYPING", data: typing });
  });

  // when the client emits 'stop typing', we broadcast it to others
  socket.on("stop typing", () => {
    typing = compact(uniq(reject({ userId: socket.userId }, typing)));
    socket.broadcast.emit("event", { type: "TYPING", data: typing });
  });

  // when the user disconnects.. perform this
  socket.on("disconnect", () => {
    console.log("Disconnect", socket.username, socket.id);
    console.log("socket.id", socket.id);
    const user = find({ userId: socket.userId }, users);
    if (user && user.isDj) {
      settings = { ...defaultSettings };
      io.emit("event", { type: "SETTINGS", data: settings });
    }

    users = uniqBy(
      "userId",
      users.filter(x => x.id !== socket.id)
    );

    // echo globally that this client has left
    socket.broadcast.emit("event", {
      type: "USER_LEFT",
      data: {
        user: { username: socket.username },
        users
      }
    });
  });
});

const setMeta = async (station, title, options = {}) => {
  console.log("setMeta");
  const silent = options.silent || false;
  if (!station) {
    fetching = false;
    meta = {};
    io.emit("event", { type: "META", data: meta });
    return;
  }
  // Lookup and emit track meta
  const info = (title || station.title).split("|");
  const track = info[0];
  const artist = info[1];
  const album = info[2];
  fetching = true;

  if (!artist & !album) {
    fetching = false;
    io.emit("event", { type: "META", data: { ...station } });
    return;
  }
  const release = settings.fetchMeta
    ? await fetchReleaseInfo(`${artist} ${album}`)
    : {};
  meta = { ...station, artist, album, track, release };
  const content = track
    ? `Up next: ${track} - ${artist} - ${album}`
    : `Up next: ${album}`;

  const newMessage = systemMessage(content, {
    artist,
    album,
    track,
    release
  });

  if (!silent) {
    io.emit("event", { type: "NEW_MESSAGE", data: newMessage });
    messages = concat(newMessage, messages);
  }
  playlist = concat(
    {
      text: `${track} - ${artist} - ${album}`,
      album,
      artist,
      track,
      timestamp: Date.now(),
      dj: find({ isDj: true }, users)
    },
    playlist
  );
  fetching = false;
  console.log("seteta", meta);
  io.emit("event", { type: "META", data: meta });
  io.emit("event", { type: "PLAYLIST", data: playlist });
  fetching = false;
};

setInterval(async () => {
  if (fetching) {
    return;
  }
  fetching = true;
  const station = await getStation(`${streamURL}/stream?type=http&nocache=4`);

  if (!station || station.bitrate === "0") {
    setMeta();
    fetching = false;
    return;
  }

  if (station.title && station.title !== "" && station.title !== meta.title) {
    cover = null;
    await setMeta(station);
  }
  fetching = false;
}, 3000);

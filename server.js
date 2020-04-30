const express = require("express");
const socketIO = require("socket.io");
const internetradio = require("node-internet-radio");
const PORT = process.env.PORT || 3000;
const INDEX = "/index.html";
const { reject } = require("lodash");

const streamURL = "http://99.198.118.250:8391";

const server = express()
  .use((req, res) => res.sendFile(INDEX, { root: __dirname }))
  .listen(PORT, () => console.log(`Listening on ${PORT}`));

const io = socketIO(server, { origins: "*:*" });

let numUsers = 0;

let users = [];

io.on("connection", socket => {
  var addedUser = false;

  // when the client emits 'new message', this listens and executes
  socket.on("new message", data => {
    // we tell the client to execute 'new message'
    socket.broadcast.emit("new message", {
      username: socket.username,
      message: data
    });
  });

  // when the client emits 'add user', this listens and executes
  socket.on("add user", ({ username, userId }) => {
    if (addedUser) return;

    // we store the username in the socket session for this client
    socket.username = username;
    socket.userId = userId;
    addedUser = true;
    const newUser = { username, userId, id: socket.id };
    users = users.concat(newUser);
    socket.emit("login", {
      users
    });
    console.log("USERS", users);
    // echo globally (all clients) that a person has connected
    socket.broadcast.emit("user joined", {
      user: newUser,
      users
    });
  });

  // when the client emits 'typing', we broadcast it to others
  socket.on("typing", () => {
    socket.broadcast.emit("typing", {
      username: socket.username
    });
  });

  // when the client emits 'stop typing', we broadcast it to others
  socket.on("stop typing", () => {
    socket.broadcast.emit("stop typing", {
      username: socket.username
    });
  });

  // when the user disconnects.. perform this
  socket.on("disconnect", () => {
    console.log("Disconnect", socket.username, socket.id);
    if (addedUser) {
      --numUsers;

      users = users.filter(x => x.id !== socket.id);

      // echo globally that this client has left
      socket.broadcast.emit("user left", {
        user: { username: socket.username },
        users
      });
    }
  });
});

setInterval(async () => {
  internetradio.getStationInfo(
    `${streamURL}/stream?type=http&nocache=4`,
    async function(error, station) {
      io.emit("meta", station);
    }
  );
}, 2000);

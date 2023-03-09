const updateUserAttributes = require("../lib/updateUserAttributes");

module.exports = function activityHandlers(
  socket,
  io,
  { getUsers },
  { setUsers }
) {
  socket.on("start listening", () => {
    const { user, users } = updateUserAttributes(
      socket.userId,
      {
        status: "listening",
      },
      { getUsers, setUsers }
    );
    io.emit("event", {
      type: "USER_JOINED",
      data: {
        user,
        users,
      },
    });
  });
  socket.on("stop listening", () => {
    const { user, users } = updateUserAttributes(
      socket.userId,
      {
        status: "participating",
      },
      { getUsers, setUsers }
    );
    io.emit("event", {
      type: "USER_JOINED",
      data: {
        user,
        users,
      },
    });
  });
};

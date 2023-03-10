const { takeRight, reject } = require("lodash/fp");

const updateUserAttributes = require("../lib/updateUserAttributes");
const { REACTIONABLE_TYPES } = require("../lib/constants");

module.exports = function activityHandlers(
  socket,
  io,
  { getUsers, getReactions },
  { setUsers, setReactions }
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

  socket.on("add reaction", ({ emoji, reactTo, user }) => {
    if (REACTIONABLE_TYPES.indexOf(reactTo.type) === -1) {
      return;
    }
    const currentReactions = getReactions();
    const newReactions = {
      ...currentReactions,
      [reactTo.type]: {
        ...currentReactions[reactTo.type],
        [reactTo.id]: [
          ...takeRight(199, currentReactions[reactTo.type][reactTo.id] || []),
          { emoji: emoji.shortcodes, user: user.userId },
        ],
      },
    };
    const reactions = setReactions(newReactions);
    io.emit("event", { type: "REACTIONS", data: { reactions } });
  });

  socket.on("remove reaction", ({ emoji, reactTo, user }) => {
    if (REACTIONABLE_TYPES.indexOf(reactTo.type) === -1) {
      return;
    }
    const currentReactions = getReactions();

    const newReactions = {
      ...currentReactions,
      [reactTo.type]: {
        ...currentReactions[reactTo.type],
        [reactTo.id]: reject(
          { emoji: emoji.shortcodes, user: user.userId },
          currentReactions[reactTo.type][reactTo.id] || []
        ),
      },
    };
    const reactions = setReactions(newReactions);
    io.emit("event", { type: "REACTIONS", data: { reactions } });
  });
};

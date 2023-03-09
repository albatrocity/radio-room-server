const systemMessage = require("../lib/systemMessage");
const parseMessage = require("../lib/parseMessage");
const sendMessage = require("../lib/sendMessage");

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
  isEqual,
  isNil,
  get,
} = require("lodash/fp");

module.exports = function authHandlers(
  socket,
  io,
  {
    getUsers,
    getMessages,
    getPlaylist,
    getReactions,
    getSettings,
    getDeputyDjs,
    getCover,
    getMeta,
    getTyping,
  },
  { setUsers, setMessages, setTyping }
) {
  socket.on("new message", (data) => {
    // we tell the client to execute 'new message'
    const users = getUsers();
    const typing = getTyping();
    const { content, mentions } = parseMessage(data);
    const payload = {
      user: find({ id: socket.id }, users) || { username: socket.username },
      content,
      mentions,
      timestamp: new Date().toISOString(),
    };
    const newTyping = compact(uniq(reject({ userId: socket.userId }, typing)));
    setTyping(newTyping);
    io.emit("event", { type: "TYPING", data: { typing: newTyping } });
    sendMessage(io, payload, { getMessages, setMessages });
  });

  socket.on("clear messages", () => {
    console.log("CLEAR MESSAGES");
    setMessages([]);
    io.emit("event", { type: "SET_MESSAGES", data: { messages: [] } });
  });

  socket.on("typing", () => {
    const newTyping = compact(
      uniq(concat(getTyping(), find({ userId: socket.userId }, getUsers())))
    );
    setTyping(newTyping);
    socket.broadcast.emit("event", {
      type: "TYPING",
      data: { typing: newTyping },
    });
  });

  socket.on("stop typing", () => {
    const newTyping = compact(
      uniq(reject({ userId: socket.userId }, getTyping()))
    );
    setTyping(newTyping);
    socket.broadcast.emit("event", {
      type: "TYPING",
      data: { typing: newTyping },
    });
  });
};

const { take, concat } = require("lodash/fp");

module.exports = function sendMessage(
  io,
  message,
  { getMessages, setMessages }
) {
  io.emit("event", { type: "NEW_MESSAGE", data: message });
  const messages = getMessages();
  console.log("new message", message);
  const newMessages = take(120, concat(message, messages));
  setMessages(newMessages);
  return newMessages;
};

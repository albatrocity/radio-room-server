const systemMessage = (content, meta) => {
  const newMessage = {
    user: {
      username: "system",
      id: "system",
      userId: "system"
    },
    content,
    meta,
    timestamp: new Date().toISOString()
  };
  return newMessage;
};

module.exports = systemMessage;

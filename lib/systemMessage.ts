const systemMessage = (content: string, meta?: {}) => {
  const newMessage = {
    user: {
      username: "system",
      id: "system",
      userId: "system",
    },
    content,
    meta,
    timestamp: new Date().toISOString(),
  };
  return newMessage;
};

export default systemMessage;

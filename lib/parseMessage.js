const { map } = require("lodash/fp");

const parseMessage = (message = "") => {
  const mentionRegex = /([])|\@\[(.*?)\]\(.*?\)/gm;
  const idRegex = /(\(.*\))/gm;
  const mentionMatches = (message || "").match(mentionRegex);
  const mentions = map(
    x =>
      x
        .match(idRegex)[0]
        .replace(/(\()/gm, "")
        .replace(/(\))/gm, ""),
    mentionMatches
  );

  const content = message.replace(mentionRegex, "@$2");

  return {
    mentions,
    content
  };
};

module.exports = parseMessage;

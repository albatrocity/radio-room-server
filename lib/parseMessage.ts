import { map } from "lodash/fp";
import { render } from "mustache";
import getMessageVariables from "./getMessageVariables";

const parseMessage = (message = "", variables?: Record<string, any>) => {
  const mentionRegex = /([])|\@\[(.*?)\]\(.*?\)/gm;
  const idRegex = /(\(.*\))/gm;
  const mentionMatches = (message || "").match(mentionRegex);
  const mentions = map(
    (x) =>
      (x.match(idRegex) || "")?.[0].replace(/(\()/gm, "").replace(/(\))/gm, ""),
    mentionMatches
  );

  const content = message.replace(mentionRegex, "@$2");
  const view = { ...getMessageVariables(), ...variables };

  const parsedContent = render(content, view);

  return {
    mentions,
    content: parsedContent,
  };
};

export default parseMessage;

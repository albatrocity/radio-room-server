import { Server } from "socket.io";
import { TriggerAction, WithTriggerMeta } from "../types/Triggers";
import likeSpotifyTrack from "../operations/spotify/likeSpotifyTrack";
import skipSpotifyTrack from "../operations/spotify/skipSpotifyTrack";
import { getters, setters } from "../lib/dataStore";
import sendMessage from "../lib/sendMessage";
import systemMessage from "../lib/systemMessage";
import parseMessage from "../lib/parseMessage";
import { WithTimestamp } from "types/Utility";

function sendMetaMessage<S, T>(
  data: WithTriggerMeta<S, T>,
  trigger: TriggerAction,
  io: Server
) {
  if (trigger.meta?.messageTemplate) {
    const message = parseMessage(trigger.meta.messageTemplate);
    sendMessage(
      io,
      systemMessage(
        message.content,
        {
          status: "info",
          title: `${trigger.type} action was triggered`,
        },
        message.mentions
      )
    );
  }
}

export default function performTriggerAction<S, T>(
  data: WithTriggerMeta<S, T>,
  trigger: TriggerAction,
  io: Server
) {
  const targetTrackUri = data.meta.target?.spotifyData?.uri;
  switch (trigger.type) {
    case "skipTrack":
      skipSpotifyTrack();
      sendMetaMessage<S, T>(data, trigger, io);
    case "likeTrack":
      targetTrackUri ? likeSpotifyTrack(targetTrackUri) : undefined;
      sendMetaMessage<S, T>(data, trigger, io);
    case "sendMessage":
      if (trigger.meta?.messageTemplate) {
        const message = parseMessage(trigger.meta.messageTemplate);
        sendMessage(
          io,
          systemMessage(
            message.content,
            {
              status: "info",
              title: `${trigger.type} action was triggered`,
            },
            message.mentions
          )
        );
      }
  }

  const currentEvents = getters.getTriggerEvents();
  setters.setTriggerEvents({
    ...currentEvents,
    [trigger.subject.type]: [
      ...currentEvents[trigger.subject.type],
      {
        ...trigger,
        timestamp: new Date().toString(),
      } as WithTimestamp<TriggerAction>,
    ],
  });
}

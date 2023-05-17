import { Server } from "socket.io";
import { TriggerEvent, WithTriggerMeta } from "../types/Triggers";
import likeSpotifyTrack from "../operations/spotify/likeSpotifyTrack";
import skipSpotifyTrack from "../operations/spotify/skipSpotifyTrack";
import { getters, setters } from "../lib/dataStore";
import sendMessage from "../lib/sendMessage";
import systemMessage from "../lib/systemMessage";
import parseMessage from "../lib/parseMessage";
import { WithTimestamp } from "types/Utility";

function sendMetaMessage<Incoming, Source>(
  data: WithTriggerMeta<Incoming, Source>,
  trigger: TriggerEvent<Source>,
  io: Server
) {
  if (trigger.meta?.messageTemplate) {
    const message = parseMessage(trigger.meta.messageTemplate, {
      ...data,
      target: {
        ...data.meta.target,
      },
      trigger,
    });
    sendMessage(
      io,
      systemMessage(
        message.content,
        {
          status: "info",
          title: `${trigger.action} action was triggered`,
        },
        message.mentions
      )
    );
  }
}

export default function performTriggerAction<Incoming, Source>(
  data: WithTriggerMeta<Incoming, Source>,
  trigger: TriggerEvent<Source>,
  io: Server
) {
  const targetTrackUri = data.meta.target?.spotifyData?.uri;
  switch (trigger.action) {
    case "skipTrack":
      skipSpotifyTrack();
      sendMetaMessage<Incoming, Source>(data, trigger, io);
      break;
    case "likeTrack":
      targetTrackUri ? likeSpotifyTrack(targetTrackUri) : undefined;
      sendMetaMessage<Incoming, Source>(data, trigger, io);
      break;
    case "sendMessage":
      if (trigger.meta?.messageTemplate) {
        sendMetaMessage<Incoming, Source>(data, trigger, io);
      }
      break;
  }

  const currentEvents = getters.getTriggerEventHistory();

  setters.setTriggerEventHistory([
    ...currentEvents,
    {
      ...trigger,
      timestamp: new Date().toString(),
    },
  ] as WithTimestamp<TriggerEvent<any>>[]);
}

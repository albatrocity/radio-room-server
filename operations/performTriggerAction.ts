import { Server } from "socket.io";
import { TriggerAction, WithTriggerMeta } from "../types/Triggers";
import likeSpotifyTrack from "../operations/spotify/likeSpotifyTrack";
import skipSpotifyTrack from "../operations/spotify/skipSpotifyTrack";
import sendMessage from "../lib/sendMessage";
import systemMessage from "../lib/systemMessage";
import parseMessage from "../lib/parseMessage";

export default function performTriggerAction<S, T>(
  data: WithTriggerMeta<S, T>,
  trigger: TriggerAction<T>,
  io: Server
) {
  const targetTrackUri = data.meta.target?.spotifyData?.uri;
  switch (trigger.type) {
    case "skipTrack":
      return skipSpotifyTrack();
    case "likeTrack":
      return targetTrackUri ? likeSpotifyTrack(targetTrackUri) : undefined;
    case "sendMessage":
      const message = parseMessage(
        trigger.meta?.template || `${trigger.type} action was triggered`
      );
      return sendMessage(
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

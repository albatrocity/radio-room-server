import systemMessage from "../lib/systemMessage";
import fetchAndSetMeta from "../operations/fetchAndSetMeta";
import getStation from "../operations/getStation";

import { HandlerConnections } from "../types/HandlerConnections";
import { Settings } from "../types/Settings";
import { User } from "../types/User";

import { getters, setters } from "../lib/dataStore";
import { TriggerEvent } from "../types/Triggers";
import { Reaction } from "../types/Reaction";
import { ChatMessage } from "../types/ChatMessage";
import getRoomPath from "../lib/getRoomPath";
import { Room } from "../types/Room";
import { clearQueue, findRoom, getUser, persistRoom } from "../operations/data";

const streamURL = process.env.SERVER_URL;

function setArtwork({ io, socket }: HandlerConnections, url?: string) {
  const newMeta = { ...getters.getMeta(), artwork: url };
  const meta = setters.setMeta(newMeta);
  io.to(getRoomPath(socket.data.roomId)).emit("event", {
    type: "META",
    data: { meta },
  });
}

export async function getSettings({ io, socket }: HandlerConnections) {
  const room = await findRoom(socket.data.roomId);
  io.to(getRoomPath(socket.data.roomId)).emit("event", {
    type: "SETTINGS",
    data: room,
  });
}

export function getTriggerEvents({ io, socket }: HandlerConnections) {
  io.to(getRoomPath(socket.data.roomId)).emit("event", {
    type: "TRIGGER_EVENTS",
    data: {
      reactions: getters.getReactionTriggerEvents(),
      messages: getters.getMessageTriggerEvents(),
    },
  });
}

export function setReactionTriggerEvents(
  { io, socket }: HandlerConnections,
  data: TriggerEvent<Reaction>[]
) {
  setters.setReactionTriggerEvents(data || []);
  io.to(getRoomPath(socket.data.roomId)).emit("event", {
    type: "TRIGGER_EVENTS",
    data: {
      reactions: getters.getReactionTriggerEvents(),
      messages: getters.getMessageTriggerEvents(),
    },
  });
}

export function setMessageTriggerEvents(
  { io, socket }: HandlerConnections,
  data: TriggerEvent<ChatMessage>[]
) {
  setters.setMessageTriggerEvents(data || []);
  io.to(getRoomPath(socket.data.roomId)).emit("event", {
    type: "TRIGGER_EVENTS",
    data: {
      reactions: getters.getReactionTriggerEvents(),
      messages: getters.getMessageTriggerEvents(),
    },
  });
}

export async function setPassword(
  connections: HandlerConnections,
  value: string
) {
  const room = await findRoom(connections.socket.data.roomId);
  if (room) {
    await persistRoom({ ...room, password: value });
  }
}

export function fixMeta(
  { io }: HandlerConnections,
  roomId: string,
  title?: string
) {
  fetchAndSetMeta({ io }, roomId, getters.getMeta().station, title);
}

export async function kickUser({ io, socket }: HandlerConnections, user: User) {
  const { userId } = user;
  const storedUser = await getUser(userId);
  const socketId = storedUser?.id;

  const newMessage = systemMessage(
    `You have been kicked. I hope you deserved it.`,
    { status: "error", type: "alert", title: "Kicked" }
  );

  if (socketId) {
    io.to(socketId).emit("event", { type: "NEW_MESSAGE", data: newMessage });
    io.to(socketId).emit("event", { type: "KICKED" });

    if (io.sockets.sockets.get(socketId)) {
      io.sockets.sockets.get(socketId)?.disconnect();
    }
  }
}

export async function settings(
  { socket, io }: HandlerConnections,
  values: Settings
) {
  const roomId = socket.data.roomId;
  const prevSettings = await findRoom(roomId);
  if (!prevSettings) {
    return {};
  }
  const newSettings = {
    ...prevSettings,
    ...values,
  };
  await persistRoom(newSettings as Room);
  io.to(getRoomPath(socket.data.roomId)).emit("event", {
    type: "SETTINGS",
    data: newSettings,
  });

  if (prevSettings.artwork !== values.artwork) {
    setArtwork({ socket, io }, values.artwork);
  }

  if (prevSettings.fetchMeta !== values.fetchMeta) {
    const station = await getStation(`${streamURL}/stream?type=http&nocache=4`);
    console.log("STATION", station);
    await fetchAndSetMeta({ io }, roomId, station, station?.title, {
      silent: true,
    });
  }
}

export async function clearPlaylist({ socket, io }: HandlerConnections) {
  await clearPlaylist(socket.data.roomId);
  await clearQueue(socket.data.roomId);

  setters.setTriggerEventHistory(
    getters.getTriggerEventHistory().filter((x) => x.target?.type !== "track")
  );
  io.to(getRoomPath(socket.data.roomId)).emit("event", {
    type: "PLAYLIST",
    data: [],
  });
}

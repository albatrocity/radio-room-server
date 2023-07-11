import { Server, Socket } from "socket.io";

type Options = {
  roomId?: string;
};

export function makeSocket({ roomId = "room123" }: Options = {}) {
  const emit = jest.fn();
  const toEmit = jest.fn();
  const broadcastEmit = jest.fn();
  const toBroadcast = jest.fn(() => ({
    emit: broadcastEmit,
  }));
  const to = jest.fn(() => ({
    emit: toEmit,
  }));
  const join = jest.fn();
  const makeSocket = jest.fn(() => ({
    data: {
      roomId,
    },
    broadcast: {
      emit: broadcastEmit,
      to: toBroadcast,
    },
    emit,
    join,
  }));

  const makeIo = jest.fn(() => ({
    data: {
      roomId: "room123",
    },
    broadcast: {
      emit: broadcastEmit,
    },
    to,
    sockets: {
      sockets: {
        get: jest.fn(),
      },
    },
    emit,
  }));
  const socket = makeSocket() as unknown as Socket;
  const io = makeIo() as unknown as Server;
  return { emit, broadcastEmit, socket, io, toEmit, toBroadcast, to, join };
}

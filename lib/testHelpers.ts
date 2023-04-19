import { Server, Socket } from "socket.io";

export function makeSocket() {
  const emit = jest.fn();
  const toEmit = jest.fn();
  const broadcastEmit = jest.fn();
  const makeSocket = jest.fn(() => ({
    data: {},
    broadcast: {
      emit: broadcastEmit,
    },
    emit,
  }));

  const makeIo = jest.fn(() => ({
    data: {},
    broadcast: {
      emit: broadcastEmit,
    },
    to: () => ({
      emit: toEmit,
    }),
    sockets: {
      sockets: {
        get: jest.fn(),
      },
    },
    emit,
  }));
  const socket = makeSocket() as unknown as Socket;
  const io = makeIo() as unknown as Server;
  return { emit, broadcastEmit, socket, io, toEmit };
}

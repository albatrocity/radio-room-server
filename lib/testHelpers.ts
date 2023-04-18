import { Server, Socket } from "socket.io";

export function makeSocket() {
  const emit = jest.fn();
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
    emit,
  }));
  const socket = makeSocket() as unknown as Socket;
  const io = makeIo() as unknown as Server;
  return { emit, broadcastEmit, socket, io };
}

export const mockSetters = {
  setCover: jest.fn(),
  setDeputyDjs: jest.fn(),
  setFetching: jest.fn(),
  setMessages: jest.fn(),
  setMeta: jest.fn(),
  setPassword: jest.fn(),
  setPlaylist: jest.fn(),
  setQueue: jest.fn(),
  setReactions: jest.fn(),
  setSettings: jest.fn(),
  setStation: jest.fn(),
  setTyping: jest.fn(),
  setUsers: jest.fn(),
};

export const mockGetters = {
  getCover: jest.fn(),
  getDefaultSettings: jest.fn(),
  getDeputyDjs: jest.fn(),
  getFetching: jest.fn(),
  getMessages: jest.fn(),
  getMeta: jest.fn(),
  getPlaylist: jest.fn(),
  getQueue: jest.fn(),
  getReactions: jest.fn(),
  getSettings: jest.fn(),
  getStation: jest.fn(),
  getTyping: jest.fn(),
  getUsers: jest.fn(),
};

export function mockDataFns() {
  jest.mock("./dataStore", () => {
    const originalModule = jest.requireActual("./dataStore");

    //Mock the default export and named export 'foo'
    return {
      __esModule: true,
      ...originalModule,
      getters: mockGetters,
      setters: mockSetters,
      createGetters: () => mockGetters,
      createSetters: () => mockSetters,
    };
  });
  return {
    mockGetters,
    mockSetters,
  };
}

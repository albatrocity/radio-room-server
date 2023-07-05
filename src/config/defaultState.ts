import { DataStores } from "../types/DataStores";
import { Settings } from "../types/Settings";

export const defaultSettings: Settings = {
  fetchMeta: true,
  extraInfo: undefined,
  password: null,
  deputizeOnJoin: false,
  enableSpotifyLogin: false,
};

const initialState: DataStores = {
  station: undefined,
  settings: { ...defaultSettings },
  deputyDjs: [],
  users: [],
  messages: [],
  typing: [],
  meta: {},
  artwork: null,
  fetching: false,
  playlist: [],
  queue: [],
  reactions: {
    message: {},
    track: {},
  },
  reactionTriggerEvents: [],
  messageTriggerEvents: [],
  triggerEventHistory: [],
  defaultSettings,
};

export default initialState;

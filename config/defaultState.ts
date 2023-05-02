import { DataStores } from "types/DataStores";
import { Settings } from "../types/Settings";
import {
  defaultReactionTriggerEvents,
  defaultMessageTriggerEvents,
} from "./defaultTriggerActions";

export const defaultSettings: Settings = {
  fetchMeta: true,
  extraInfo: undefined,
  donationURL: undefined,
  password: null,
};

const initialState: DataStores = {
  station: undefined,
  settings: { ...defaultSettings },
  deputyDjs: [],
  users: [],
  messages: [],
  typing: [],
  meta: {},
  cover: null,
  fetching: false,
  playlist: [],
  queue: [],
  reactions: {
    message: {},
    track: {},
  },
  reactionTriggerEvents: defaultReactionTriggerEvents,
  messageTriggerEvents: defaultMessageTriggerEvents,
  triggerEventHistory: [],
  defaultSettings,
};

export default initialState;

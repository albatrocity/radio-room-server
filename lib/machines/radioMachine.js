const { Machine } = require("xstate");
// const getStation = require("../getStation");
// const fetchReleaseInfo = require("../fetchReleaseInfo");

const getStation = () =>
  Promise.resolve({ title: "Title|Artist|Album", bitrate: "0" });
const fetchReleaseInfo = () =>
  Promise.resolve({ title: "Title", bitrate: "0" });
const streamURL = "https://stream.url";
const extractTrackInfo = info => {
  const d = info.split("|");
  const track = d[0];
  const artist = d[1];
  const album = d[2];
  return { track, artist, album };
};

const every = (...guards) => ({
  type: "every",
  guards
});

const guards = {
  isStreaming: (context, event) => {
    const { data } = event;
    console.log("isStreaming", data ? data.bitrate !== "0" : false);
    return data ? data.bitrate !== "0" : false;
  },
  hasNewShoutcastMeta: (context, event) => {
    const { data } = event;
    console.log(
      "hasNewShoutcastMeta",
      data && data.title !== context.meta.title
    );
    return data ? data.title !== context.meta.title : false;
  },
  hasTitleAndRelease: (context, event) => {
    const { data } = event;
    if (!data) {
      return false;
    }
    const { track, artist, album } = extractTrackInfo(data.title);
    console.log("hasTitleAndRelease", artist && album);
    return artist && album ? true : false;
  }
};

const radioMachine = Machine(
  {
    id: "radio",
    initial: "idle",
    context: {
      meta: {},
      settings: {},
      messages: [],
      typing: [],
      users: [],
      cover: null
    },
    states: {
      idle: {
        on: {
          "": "online.fetchingStation"
        }
      },
      online: {
        id: "online",
        initial: "fetchingStation",
        on: {
          DISCONNECT: "offline"
        },
        states: {
          fetchingStation: {
            invoke: {
              src: "fetchMeta",
              onDone: [
                {
                  target: "fetchingRelease",
                  actions: ["setMeta"],
                  cond: every(
                    "isStreaming",
                    "hasNewShoutcastMeta",
                    "hasTitleAndRelease"
                  )
                },
                {
                  target: "idle",
                  actions: ["setMeta", "sendMeta"],
                  cond: every("isStreaming", "hasNewShoutcastMeta")
                },
                {
                  target: "idle",
                  cond: "isStreaming"
                },
                {
                  target: "#radio.offline"
                }
              ]
            }
          },
          fetchingRelease: {
            invoke: {
              src: "fetchRelease",
              onDone: {
                target: "idle",
                actions: ["setReleaseMeta", "sendMeta"]
              }
            }
          },
          idle: {
            after: { 5000: "fetchingStation" }
          }
        }
      },
      offline: {}
    }
  },
  {
    guards: {
      ...guards,
      every: (ctx, event, { guard }) => {
        const { guards } = guard;
        return guards.every(guardKey => guards[guardKey](ctx, event));
      }
    },
    actions: {
      setTyping: assign((ctx, event) => {
        return { typing: event.data };
      }),
      setMeta: assign((ctx, event) => {
        const { data } = event;
        if (!data) {
          return;
        }
        const { track, artist, album } = extractTrackInfo(data.title);
        return { meta: { track, artist, album } };
      }),
      setReleaseMeta: assign((ctx, event) => {
        return { meta: Object.assign(meta, { release: event.data || {} }) };
      }),
      sendMeta: (context, event) => {
        console.log("SEND META!", context, event);
      },
      addMessage: assign({
        messages: (context, event) => {
          return [...context.messages, event.data];
        }
      })
    },
    services: {
      fetchMeta: (context, event) => {
        console.log(event);
        const { data } = event;
        if (!data) {
          return;
        }
        const info = extractTrackInfo(event.data.title);
        const artist = info[1];
        const album = info[2];
        return fetchReleaseInfo(`${artist} ${album}`);
      },
      fetchRelease: (context, event) =>
        getStation(`${streamURL}/stream?type=http&nocache=4`)
    }
  }
);

module.exports = radioMachine;

export const SPOTIFY_REFRESH_TOKEN = "spotifyRefreshToken";
export const SPOTIFY_ACCESS_TOKEN = "spotifyAccessToken";
export const REACTIONABLE_TYPES = ["message", "track"];

export const FIVE_SECONDS = 1000 * 5;
export const TEN_SECONDS = 1000 * 10;
export const THREE_MINUTES = 1000 * 60 * 3;
export const FIVE_MINUTES = 1000 * 60 * 5;
export const FORTY_FIVE_MINS = 1000 * 60 * 45;
export const ONE_DAY = 1000 * 60 * 60 * 24;
export const THREE_DAYS = 1000 * 60 * 60 * 24 * 3;
export const SEVEN_DAYS = 1000 * 60 * 60 * 24 * 7;

export const JUKEBOX_FETCH_INTERVAL = FIVE_SECONDS;
export const THROTTLED_JUKEBOX_FETCH_INTERVAL = TEN_SECONDS;

export const ROOM_EXPIRE_TIME = ONE_DAY;

export const PUBSUB_JUKEBOX_NOW_PLAYING_FETCHED = "JUKEBOX:NOW_PLAYING_FETCHED";
export const PUBSUB_PLAYLIST_UPDATED = "PLAYLIST:UPDATED";
export const PUBSUB_PLAYLIST_ADDED = "PLAYLIST:ADDED";
export const PUBSUB_SPOTIFY_AUTH_ERROR = "ERROR:SPOTIFY_AUTH";
export const PUBSUB_SPOTIFY_RATE_LIMIT_ERROR = "ERROR:SPOTIFY_RATE_LIMIT";

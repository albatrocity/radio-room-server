import { Schema, Repository } from "redis-om";

import { pubClient } from "../lib/redisClients";
import { ChatMessage } from "../types/ChatMessage";
import { PlaylistTrack } from "../types/PlaylistTrack";
import { SpotifyAlbum } from "../types/SpotifyAlbum";

type StoredPlaylistTrack = {
  id: string;
  href?: string;
  uri?: string;
  text: string;
  title: string;
  artistNames: string[];
  artistUris: string[];
  artistHrefs: string[];
  artistIds: string[];
  albumUri: string;
  albumName: string;
  albumType: SpotifyAlbum["album_type"];
  albumImages: string[];
  djId?: string;
  djUsername?: string;
  timestamp: number;
};

// defines RedisOm schema for the PlaylistTrack model
export const playlistTrackSchema = new Schema("playlistTrack", {
  id: {
    type: "string",
  },
  href: {
    type: "string",
  },
  uri: {
    type: "string",
  },
  text: {
    type: "string",
  },
  title: {
    type: "string",
  },
  artistNames: {
    type: "string[]",
  },
  artistUris: {
    type: "string[]",
  },
  artistHrefs: {
    type: "string[]",
  },
  artistIds: {
    type: "string[]",
  },
  albumUri: {
    type: "string",
  },
  albumName: {
    type: "string",
  },
  albumType: {
    type: "string",
  },
  albumImages: {
    type: "string[]",
  },
  djId: {
    type: "string",
  },
  djUsername: {
    type: "string",
  },
  timestamp: {
    type: "number",
  },
});

export const playlistTrackRepository = new Repository(
  playlistTrackSchema,
  pubClient
);

export function playlistToOm(track: PlaylistTrack) {
  return {
    id: track.spotifyData?.id || `${track.text}-${track.artist}`,
    href: track.spotifyData?.href || "",
    uri: track.spotifyData?.uri || "",
    text: track.text,
    title: track.spotifyData?.name || track.track,
    artistNames: track.spotifyData?.artists?.map((artist) => artist.name) || [
      track.artist,
    ],
    artistUris: track.spotifyData?.artists?.map((artist) => artist.uri) || [],
    artistHrefs: track.spotifyData?.artists?.map((artist) => artist.href) || [],
    artistIds: track.spotifyData?.artists?.map((artist) => artist.id) || [],
    albumUri: track.spotifyData?.album?.uri,
    albumName: track.spotifyData?.album?.name || track.album,
    albumType: track.spotifyData?.album?.album_type,
    albumImages: track.spotifyData?.album?.images?.map((image) => image.url),
    djId: track.dj?.userId,
    djUsername: track.dj?.username,
    timestamp: track.timestamp,
  };
}

// converts a playlistTrackSchema to a PlaylistTrack
function toPlaylistTrackModel(track: StoredPlaylistTrack): PlaylistTrack {
  const artists = (track.artistNames ?? []).map((name, i) => ({
    name,
    uri: track.artistUris[i],
    id: track.artistIds[i],
    href: track.artistHrefs[i],
    type: "artist" as const,
  }));
  return {
    id: track.id,
    href: track.href,
    uri: track.uri,
    text: track.text,
    track: track.title,
    artist: track.artistNames[0],
    album: track.albumName,
    timestamp: track.timestamp,
    spotifyData: {
      id: track.id,
      href: track.href,
      uri: track.uri,
      name: track.title,
      artists,
      album: {
        uri: track.albumUri,
        name: track.albumName,
        album_type: track.albumType,
        artists: [],
        images: (track.albumImages ?? []).map((url) => ({
          url,
          width: 0,
          height: 0,
        })),
      },
    },
  };
}

export async function getAllMessages() {
  const playlistTracks: StoredPlaylistTrack[] = [];
  await (async () => {
    for await (const key of pubClient.scanIterator({
      MATCH: "playlistTrack:*",
    })) {
      const v = await pubClient.hGetAll(key);
      playlistTracks.push(v);
    }
  })();
  return playlistTracks.map(toPlaylistTrackModel);
}

export async function deleteAllPlaylistTracks() {
  await (async () => {
    for await (const key of pubClient.scanIterator({
      MATCH: "playlistTrack:*",
    })) {
      await pubClient.del(key);
    }
  })();
}

import { pubClient } from "../../lib/redisClients";
import { PlaylistTrack } from "../../types/PlaylistTrack";

export async function addTrackToRoomPlaylist(
  roomId: string,
  track: PlaylistTrack
) {
  try {
    const trackString = JSON.stringify(track);
    const key = `room:${roomId}:playlist`;
    const score = Date.now();
    return pubClient.zAdd(key, [{ score, value: trackString }]);
  } catch (e) {
    console.log(
      "ERROR FROM data/playlists/addTrackToRoomPlaylist",
      roomId,
      track
    );
    console.error(e);
  }
}

export async function getRoomPlaylist(
  roomId: string,
  offset: number = 0,
  count: number = -1
) {
  try {
    const roomKey = `room:${roomId}:playlist`;
    const roomExists = await pubClient.exists(roomKey);
    if (!roomExists) {
      return [];
    } else {
      const results = await pubClient.zRange(roomKey, offset, count);
      return results.map((m) => JSON.parse(m) as PlaylistTrack) || [];
    }
  } catch (e) {
    console.log(
      "ERROR FROM data/playlists/getRoomPlaylist",
      roomId,
      offset,
      count
    );
    console.error(e);
    return [];
  }
}

export async function clearRoomPlaylist(roomId: string) {
  try {
    console.log("CLEARING Playlist", roomId);
    const roomKey = `room:${roomId}:playlist`;
    return pubClient.del(roomKey);
  } catch (e) {
    console.log("ERROR FROM data/messages/clearMessages", roomId);
    console.error(e);
  }
}

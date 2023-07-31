import { RoomNowPlaying } from "../types/RoomNowPlaying";
import { Station } from "../types/Station";

function makeStationArtists(stationMeta?: Station) {
  return undefined;
}
function makeStationAlbum(stationMeta?: Station) {
  return undefined;
}

export default async function makeNowPlayingFromStationMeta(
  stationMeta?: Station
): Promise<RoomNowPlaying> {
  return {
    name: stationMeta?.title,
    album: makeStationAlbum(stationMeta),
    type: "track",
    artists: makeStationArtists(stationMeta),
  };
}

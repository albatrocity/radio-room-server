import spotifyApi from "../lib/spotifyApi";

const fetchReleaseInfo = async (query: string) => {
  try {
    const data = await spotifyApi.searchTracks(query);

    const track = data.body?.tracks?.items[0];
    const release = track?.album;

    return release
      ? {
          releaseDate: release?.release_date,
          name: release.name,
          artwork: release?.images?.find(({ width }) => width || 0 > 200)?.url,
          artworkImages: release?.images,
          url: track?.external_urls?.spotify,
          uri: track?.uri,
        }
      : null;
  } catch (e) {
    console.error(e);
    return {};
  }
};

export default fetchReleaseInfo;

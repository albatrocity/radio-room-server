const spotifyApi = require("./spotifyApi");

const fetchReleaseInfo = async (query) => {
  try {
    const data = await spotifyApi.searchTracks(query);

    const track = data.body?.tracks.items[0];
    const release = track?.album;

    return release
      ? {
          mbid: release?.mbid,
          releaseDate: release?.release_date,
          name: release.name,
          artwork: release?.images?.find(({ width }) => width > 200)?.url,
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

module.exports = fetchReleaseInfo;

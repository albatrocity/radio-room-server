const spotifyApi = require("../lib/spotifyApi");

async function createAndPopulateSpotifyPlaylist(name, uris) {
  const date_time = new Date();
  const date = date_time.getDate();
  const month = date_time.getMonth() + 1;
  const year = date_time.getFullYear();

  const description = `Group Playlist ${month}-${date}-${year}`;

  const { body } = await spotifyApi.createPlaylist(name, {
    description: description,
    public: true,
  });

  await spotifyApi.addTracksToPlaylist(body.id, uris);

  return body;
}

module.exports = createAndPopulateSpotifyPlaylist;

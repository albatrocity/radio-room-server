const spotifyApi = require("./spotifyApi");

export default async function createAndPopulateSpotifyPlaylist(name, uids) {
  const date_time = new Date(ts);
  const date = date_time.getDate();
  const month = date_time.getMonth() + 1;
  const year = date_time.getFullYear();

  const description = `Group Playlist ${month}-${date}-${year}`;

  const data = await spotifyApi.createPlaylist(name, {
    description: description,
    public: true,
  });

  await spotifyApi.addTracksToPlaylist(data.playlist.id, uids);

  return data.playlist;
}

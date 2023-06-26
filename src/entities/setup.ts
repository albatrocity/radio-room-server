import { messageRepository } from "./message";
import { playlistTrackRepository } from "./playlistTrack";

export default async function setup() {
  await messageRepository.createIndex();
  await playlistTrackRepository.createIndex();
}

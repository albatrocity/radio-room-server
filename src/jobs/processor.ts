import jukebox from "./jukebox";
import { pubClient } from "../lib/redisClients";

setInterval(() => {
  console.log("Processor");
  jukebox();
}, 10000);

pubClient.connect();
jukebox();

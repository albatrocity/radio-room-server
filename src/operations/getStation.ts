import internetradio from "node-internet-radio";
import { Station } from "../types/Station";
import { ERROR_STATION_FETCH_FAILED } from "../lib/constants";

const getStation = async (url: string): Promise<Station> => {
  console.log("ERROR", url);
  return new Promise((resolve, reject) => {
    internetradio.getStationInfo(
      url,
      (error: any, station: Station) => {
        if (error) {
          return reject(new Error(ERROR_STATION_FETCH_FAILED));
        }
        return resolve(station);
      }
      // internetradio.StreamSource.SHOUTCAST_V2
    );
  });
};

export default getStation;

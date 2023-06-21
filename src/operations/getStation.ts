import internetradio from "node-internet-radio";
import { Station } from "../types/Station";

const getStation = async (url: string): Promise<Station> => {
  return new Promise((resolve, reject) => {
    internetradio.getStationInfo(
      url,
      (error: any, station: Station) => {
        if (error) {
          return reject(error);
        }
        return resolve(station);
      },
      internetradio.StreamSource.SHOUTCAST_V2
    );
  });
};

export default getStation;

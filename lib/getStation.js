const util = require("util");
const internetradio = require("node-internet-radio");
const getStation = util.promisify(internetradio.getStationInfo);

module.exports = getStation;

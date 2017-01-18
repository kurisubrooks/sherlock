const keys = require("./keychain.json");

module.exports = {
    http: 80,
    https: 443,
    api: {
        aqi: {
            description: "AQI Endpoint"
        },
        fire: {
            description: "Fires in/around Penrith"
        },
        ping: {
            description: "Server Ping"
        },
        translate: {
            description: "Google Translate"
        },
        weather: {
            description: "Weather Endpoint"
        }
    },
    generator: {
        shake: {
            description: "Shake Endpoint"
        },
        radar: {
            description: "Radar"
        }
    },
    data: {
        aqi: {
            name: "aqi",
            format: "json",
            url: "https://waqi.info/api/widget/3255/widget.v1.json",
            interval: 10
        },
        fire: {
            name: "fire",
            format: "json",
            url: "http://www.rfs.nsw.gov.au/feeds/majorIncidents.json",
            interval: 1
        },
        weather: {
            name: "weather",
            format: "json",
            url: `http://api.wunderground.com/api/${keys.weather}/conditions/forecast10day/astronomy/q/Australia/Penrith.json`,
            interval: 5
        }
    }
};

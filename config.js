const keys = require("./keychain.json")

module.exports = {
    port: 80,
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
        }
    },
    data: {
        aqi: {
            name: "aqi",
            format: "json",
            url: "https://waqi.info/api/widget/3255/widget.v1.json"
        },
        fire: {
            name: "fire",
            format: "json",
            url: "http://www.rfs.nsw.gov.au/feeds/majorIncidents.json"
        },
        weather: {
            name: "weather",
            format: "json",
            url: `http://api.wunderground.com/api/${keys.weather}/conditions/q/AU/Penrith.json`
        }
    }
}

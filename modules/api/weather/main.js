"use strict"

const suncalc = require("suncalc")

let pad = (n) => String(n).length === 1 ? "0" + String(n) : String(n)

let icon = (condition, now, lat, long) => {
    let time = suncalc.getTimes(new Date(), lat, long)
    let sunrise = `${pad(time.sunrise.getHours())}${pad(time.sunrise.getMinutes())}`
    let sunset = `${pad(time.sunset.getHours())}${pad(time.sunset.getMinutes())}`
    let day = now >= sunrise && now <= sunset ? true : false

    let icons = {
        "chanceflurries":   "flurries",
        "chancerain":       "showers_rain",
        "chancesleat":      "wintry_mix_rain_snow",
        "chancesnow":       "snow_showers_snow",
        "chancetstorms":    day ? "isolated_scattered_tstorms_day" : "isolated_scattered_tstorms_night",
        "clear":            day ? "clear_day" : "clear_night",
        "cloudy":           "cloudy",
        "flurries":         "flurries",
        "fog":              "haze_fog_dust_smoke",
        "hazy":             "haze_fog_dust_smoke",
        "mostlycloudy":     day ? "mostly_cloudy_day" : "mostly_cloudy_night",
        "mostlysunny":      "mostly_sunny",
        "partlycloudy":     day ? "partly_cloudy" : "partly_cloudy_night",
        "partlysunny":      "partly_sunny",
        "rain":             "showers_rain",
        "sleat":            "wintry_mix_rain_snow",
        "snow":             "snow_showers_snow",
        "sunny":            "clear_day",
        "tstorms":          day ? "isolated_scattered_tstorms_day" : "isolated_scattered_tstorms_night",
        "unknown":          "unknown"
    }

    return icons[condition] ? icons[condition] : icons.unknown
}

module.exports = (server, body) => {
    let res = server.res
    let fs = server.modules.fs
    let path = server.modules.path
    let moment = server.modules.moment

    fs.readFile(path.join(server.storage, "weather.json"), (error, body) => {
        if (error) {
            console.error(error)
            res.status(500).send({ ok: false, code: 500, error: "Internal Server Error" })
            return error
        }

        let data = JSON.parse(body).data.current_observation
        let icon_code = icon(data.icon, moment.unix(data.local_epoch).format("HHMM"), data.display_location.latitude, data.display_location.longitude)

        res.send({
            ok: true,
            location: {
                full: data.display_location.full,
                city: data.display_location.city,
                state: data.display_location.state,
                country: data.display_location.country_iso3166,
                lat: data.display_location.latitude,
                long: data.display_location.longitude,
                time: data.local_epoch,
                timezone: data.local_tz_long,
                offset: data.local_tz_offset
            },
            weather: {
                icon: icon_code,
                image: `http://kurisu.pw/static/weather/icons/${icon_code}_dark.png`,
                condition: data.weather,
                temperature: Number(data.temp_c),
                feels_like: Number(data.feelslike_c),
                dewpoint: Number(data.dewpoint_c),
                humidity: data.relative_humidity,
                pressure: Number(data.pressure_mb),
                visibility: Number(data.visibility_km),
                heat_index: data.heat_index_c,
                solar_radiation: Number(data.solarradiation),
                UV: Number(data.UV),
                wind: {
                    chill: data.windchill_c,
                    string: data.wind_string,
                    dir: data.wind_dir,
                    degrees: Number(data.wind_degrees),
                    gust: Number(data.wind_gust_kph),
                    kph: Number(data.wind_kph)
                },
                precipitation: {
                    hour: Number(data.precip_1hr_metric),
                    today: Number(data.precip_today_metric)
                }
            }
        })
    })
}

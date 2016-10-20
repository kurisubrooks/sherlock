"use strict"

let icon = (condition, time) => {
    let day = time >= 5 && time <= 19 ? true : false

    let icons = {
        "chanceflurries":   "flurries_dark",
        "chancerain":       "showers_rain_dark",
        "chancesleat":      "wintry_mix_rain_snow_dark",
        "chancesnow":       "snow_showers_snow_dark",
        "chancetstorms":    day ? "isolated_scattered_tstorms_day_dark" : "isolated_scattered_tstorms_night_dark",
        "clear":            day ? "sunny_dark" : "clear_night_dark",
        "cloudy":           "cloudy_dark",
        "flurries":         "flurries_dark",
        "fog":              "haze_fog_dust_smoke_dark",
        "hazy":             "haze_fog_dust_smoke_dark",
        "mostlycloudy":     day ? "mostly_cloudy_day_dark" : "mostly_cloudy_night_dark",
        "mostlysunny":      "mostly_sunny_dark",
        "partlycloudy":     day ? "partly_cloudy_dark" : "partly_cloudy_night_dark",
        "partlysunny":      "partly_sunny_dark",
        "rain":             "showers_rain_dark",
        "sleat":            "wintry_mix_rain_snow_dark",
        "snow":             "snow_showers_snow_dark",
        "sunny":            "sunny_dark",
        "tstorms":          day ? "isolated_scattered_tstorms_day_dark" : "isolated_scattered_tstorms_night_dark",
        "unknown":          "unknown"
    }

    return icons[condition]
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
        let icon_code = icon(data.icon, moment.unix(data.local_epoch).format("HH"))

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
                image: `http://kurisu.pw/static/weather/icons/${icon_code}.png`,
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

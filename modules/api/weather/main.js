"use strict"

module.exports = (server, body) => {
    let res = server.res
    let fs = server.modules.fs
    let path = server.modules.path

    let icon = {
        "chanceflurries": "flurry",
        "chancerain": "rain",
        "chancesleat": "sleet",
        "chancesnow": "snow_showers_snow",
        "chancetstorms": "strong_tstorms",
        "clear": "clear_night",
        "cloudy": "cloudy",
        "flurries": "flurries",
        "fog": "haze_fog_dust_smoke",
        "hazy": "haze_fog_dust_smoke",
        "mostlycloudy": "mostly_cloudy",
        "mostlysunny": "mostly_sunny",
        "partlycloudy": "partly_cloudy",
        "partlysunny": "partly_sunny",
        "rain": "showers_rain",
        "sleat": "wintry_mix_rain_snow",
        "snow": "snow_showers_snow",
        "sunny": "sunny",
        "tstorms": "strong_tstorms",
        "unknown": "unknown"
    }

    fs.readFile(path.join(server.storage, "weather.json"), (error, body) => {
        if (error) {
            console.error(error)
            res.status(500).send({ ok: false, code: 500, error: "Internal Server Error" })
            return error
        }

        let data = JSON.parse(body).data.current_observation

        res.send({ ok: true, result: {
            location: {
                full: data.display_location.full,
                city: data.display_location.city,
                state: data.display_location.state,
                country: data.display_location.country_iso3166,
                lat: data.display_location.latitude,
                long: data.display_location.longitude,
                time: Number(data.local_epoch),
                timezone: data.local_tz_long,
                offset: data.local_tz_offset
            },
            icon: data.icon,
            image: `http://kurisu.pw/static/weather/icons/${icon[data.icon]}_dark.png`,
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
        }})
    })
}

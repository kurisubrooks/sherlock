"use strict";

let pad = (n) => String(n).length === 1 ? "0" + String(n) : String(n);

let test = (c) => {
    if (c === undefined || c === null || c === void 0 || c === "")
        return 0;
    else
        return 1;
};

let icon = (condition, now, phases) => {
    let sunrise, sunset, day;

    if (now && phases) {
        sunrise = `${pad(phases.sunrise.hour)}${pad(phases.sunrise.minute)}`;
        sunset = `${pad(phases.sunset.hour)}${pad(phases.sunset.minute)}`;
        day = now >= sunrise && now <= sunset ? true : false;
    } else {
        day = true;
    }

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
    };

    if (condition === undefined || condition === null || condition === void 0 || condition === "")
        return icons.unknown;

    return icons[condition] ? icons[condition] : icons.unknown;
};

module.exports = (server, body) => {
    let res = server.res;
    let _ = server.modules.lodash;
    let fs = server.modules.fs;
    let path = server.modules.path;
    let moment = server.modules.moment;

    fs.readFile(path.join(server.storage, "weather.json"), (error, body) => {
        if (error) {
            console.error(error);
            res.status(500).send({ ok: false, code: 500, error: "Internal Server Error" });
            return error;
        }

        let data = JSON.parse(body).data;

        if (!data.current_observation) {
            console.error("Missing Data");
            res.status(500).send({ ok: false, code: 500, error: "Internal Server Error" });
            return;
        }

        let icon_code = icon(data.current_observation.icon, moment.unix(data.current_observation.local_epoch).format("HHMM"), data.sun_phase);

        let result = {
            ok: true,
            location: {
                full: data.current_observation.display_location.full,
                city: data.current_observation.display_location.city,
                state: data.current_observation.display_location.state,
                country: data.current_observation.display_location.country_iso3166,
                lat: data.current_observation.display_location.latitude,
                long: data.current_observation.display_location.longitude,
                time: data.current_observation.local_epoch,
                timezone: data.current_observation.local_tz_long,
                offset: data.current_observation.local_tz_offset
            },
            weather: {
                icon: icon_code,
                image: `https://api.kurisubrooks.com/static/weather/icons/${icon_code}_dark.png`,
                condition: data.current_observation.weather,
                temperature: Number(data.current_observation.temp_c),
                feels_like: Number(data.current_observation.feelslike_c),
                dewpoint: Number(data.current_observation.dewpoint_c),
                humidity: data.current_observation.relative_humidity,
                pressure: data.current_observation.pressure_mb + " mBar",
                visibility: data.current_observation.visibility_km + " km",
                UV: Number(data.current_observation.UV),
                wind: {
                    chill: data.current_observation.windchill_c,
                    direction: data.current_observation.wind_dir,
                    degrees: Number(data.current_observation.wind_degrees),
                    gust: data.current_observation.wind_gust_kph + " km/h",
                    kph: data.current_observation.wind_kph + " km/h"
                },
                precipitation: {
                    hour: data.current_observation.precip_1hr_metric + " mm",
                    today: data.current_observation.precip_today_metric + " mm"
                }
            },
            forecast: []
        };

        _.each(data.forecast.simpleforecast.forecastday, (object) => {
            result.forecast.push({
                date: {
                    day: object.date.day,
                    month: object.date.month,
                    year: object.date.year,
                    total: object.date.yday,
                    display: {
                        day: object.date.weekday,
                        day_short: object.date.weekday_short,
                        month: object.date.monthname,
                        month_short: object.date.monthname_short
                    },
                    time: object.date.epoch,
                    timezone: object.date.tz_long
                },
                icon: icon(object.icon),
                image: `https://api.kurisubrooks.com/static/weather/icons/${icon(object.icon)}_dark.png`,
                condition: object.conditions,
                high: Number(object.high.celsius),
                low: Number(object.low.celsius),
                humidity: object.avehumidity + "%",
                rain_chance: object.pop + "%",
                rainfall: object.qpf_allday.mm + " mm",
                snowfall: object.snow_allday.cm + " cm",
                wind: {
                    max: object.maxwind.kph + " km/h",
                    average: object.avewind.kph + " km/h",
                    direction: object.avewind.dir,
                    degrees: Number(object.avewind.degrees)
                }
            });
        });

        res.send(result);
    });
};

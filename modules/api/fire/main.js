let alertLevels = [
    "Not Applicable",
    "Advice",
    "Watch and Act",
    "Emergency Warning"
];

let alertType = [
    "Out of control",
    "Being controlled",
    "Under control"
];

let fireType = [
    "Bush Fire",
    "Grass Fire",
    "Hazard Reduction",
    "Structure Fire",
    "Burn off"
];

let removeEvents = [
    "MVA/Transport",
    "Assist Other Agency",
    "Search/Rescue",
    "Flood/Storm/Tree Down",
    "Vehicle/Equipment Fire",
    "Fire Alarm",
    "Medical",
    "HAZMAT",
    "Other"
];

module.exports = (server, args) => {
    let res = server.res;
    let { fs, path } = server.modules;
    let turf = require("@turf/turf");
    let markdown = require("to-markdown");
    let filter;

    // Region filters
    if (args.filter) {
        if (args.filter === "debug") {
            filter = require("./filter_debug.json");
        } else if (args.filter === "emergency") {
            filter = require("./filter_emergency.json");
        }
    } else {
        filter = require("./filter_penrith.json");
    }

    // Load cached data
    return fs.readFile(path.join(server.storage, "fire.json"), (error, body) => {
        if (error) {
            console.error(error);
            res.sendStatus(500).send({ ok: false, code: 500, error: "Internal Server Error" });
            return error;
        }

        let incidents = JSON.parse(body).data;
        let results = [];
        let radius = 0.025;

        // Formatting function
        let format = (feature) => {
            let properties = feature.properties;
            let description = markdown(properties.description).split("\n");
            let formatted = { };
            let final = { };

            // Split Original String into Parsable Object
            for (let i of description) {
                description[i] = i.split(/:(.+)?/);
                description[i].splice(2, 1);
                description[i][1] = description[i][1].trim();
                formatted[description[i][0]] = description[i][1];
            }

            // if Level "Not Applicable" && Matches Blacklist, Remove
            if (alertLevels.indexOf(properties.category) === 0 && removeEvents.includes(formatted.TYPE)) return;

            // Format Data
            final.title = properties.title.trim();
            final.guid = Number(properties.guid.replace("https://incidents.rfs.nsw.gov.au/api/v1/incidents/", ""));
            final.level = alertLevels.indexOf(properties.category);
            final.type = formatted.TYPE;
            final.category = properties.category;
            final.location = formatted.LOCATION;
            final.status = formatted.STATUS;
            final.size = Number(formatted.SIZE.replace(" ha", ""));
            final.updated = { };
            final.updated.unix = Date.parse(formatted.UPDATED);
            final.updated.timestamp = Date.parse(formatted.UPDATED);
            final.geojson = feature;
            final.geojson.properties = { };

            results.push(final);
        };

        // Each filter
        for (let filterFeature of filter.features) {
            let geometry = filterFeature.geometry;
            let filter = geometry.type === "Point" ? turf.circle(geometry, geometry.properties.radius) : geometry;

            // Each incident
            for (let feature of incidents.features) {
                let geometry = feature.geometry;

                // filter results to overlapping regions
                let result = turf.intersect(filter, geometry.type === "Point" ? turf.circle(geometry, radius) : geometry.geometries[1].geometries[0]);

                // if match
                if (result !== undefined) format(feature);
            }
        }

        // Sort results by HIGH→LOW warning levels
        // then sort by Distance from Home
        results.sort((a, b) => {
            let home = ["-33.746", "150.7123"];

            if (a.level > b.level) {
                // if a's level is higher than b's, prepend
                return -1;
            } else if (a.level === b.level) {
                // if a's warning level matches b's
                let a_lat, a_long, b_lat, b_long;

                // set lat, long vars
                if (a.geojson.geometry.type === "Point") {
                    a_lat = a.geojson.geometry.coordinates[1];
                    a_long = a.geojson.geometry.coordinates[0];
                } else {
                    a_lat = a.geojson.geometry.geometries[0].coordinates[1];
                    a_long = a.geojson.geometry.geometries[0].coordinates[0];
                }

                if (b.geojson.geometry.type === "Point") {
                    b_lat = b.geojson.geometry.coordinates[1];
                    b_long = b.geojson.geometry.coordinates[0];
                } else {
                    b_lat = b.geojson.geometry.geometries[0].coordinates[1];
                    b_long = b.geojson.geometry.geometries[0].coordinates[0];
                }

                // sort by distance
                if (Math.abs(Math.sqrt(Math.pow(a_lat - home[0], 2) + Math.pow(a_long - home[1], 2))) < Math.abs(Math.sqrt(Math.pow(b_lat - home[0], 2) + Math.pow(b_long - home[1], 2)))) {
                    return -1;
                } else {
                    return 1;
                }
            } else {
                // else append
                return 1;
            }
        });

        // Serve Data
        return res.send({
            ok: true,
            total: incidents.features.length,
            search: results.length,
            fires: results
        });
    });
};

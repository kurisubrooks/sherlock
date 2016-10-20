"use strict"

const turf = require("@turf/turf")
const mark = require("to-markdown")

const radius = turf.circle(turf.point([150.689713, -33.737247]), 20)
const warningLevels = [ "Emergency Warning", "Watch and Act", "Advice", "Not Applicable" ]
const warningIndex = { "Emergency Warning": 3, "Watch and Act": 2, "Advice": 1, "Not Applicable": 0 }

let rename = (object, key, to, value) => {
    if (value !== undefined || null) object[key] = value
    object[to] = object[key]
    delete object[key]
}

let remove = (object, key) => {
    delete object[key]
}

module.exports = (server, args) => {
    let res = server.res
    let _ = server.modules.lodash
    let fs = server.modules.fs
    let path = server.modules.path
    let moment = server.modules.moment

    fs.readFile(path.join(server.storage, "fire.json"), (error, body) => {
        if (error) {
            console.error(error)
            res.status(500).send({ ok: false, code: 500, error: "Internal Server Error" })
            return error
        }

        let features = JSON.parse(body).data.features
        let results = []
        let all = []

        // Find intersecting points inside search radius
        _.each(features, (feature) => {
            let geometry = feature.geometry
            let intersect = geometry.type === "Point" ? turf.circle(geometry, 0.025) : geometry.geometries[1].geometries[0]
            let result = turf.intersect(radius, intersect)

            if (result !== undefined) results.push(feature.properties)
        })

        // Sort results by level
        results.sort((a, b) => 
            warningLevels.indexOf(a.category) - warningLevels.indexOf(b.category))

        // Format each result
        _.each(results, (r) => {
            let o = {}

            r.description = mark(r.description).split("\n")
            r.guid = r.guid.replace("https://incidents.rfs.nsw.gov.au/api/v1/incidents/", "")
            r.published = r.pubDate

            _.each(r.description, (s) => {
                r.description[s] = s.split(/:(.+)?/)
                r.description[s].splice(2, 1)
                r.description[s][1] = r.description[s][1].trim()
                o[r.description[s][0]] = r.description[s][1]
            })

            rename(o, "ALERT LEVEL", "level", warningIndex[o["ALERT LEVEL"]])
            rename(o, "LOCATION", "location")
            rename(o, "COUNCIL AREA", "council")
            rename(o, "STATUS", "status")
            rename(o, "TYPE", "type")
            rename(o, "FIRE", "fire", o.FIRE === "Yes" ? true : false)
            rename(o, "SIZE", "size")
            rename(o, "RESPONSIBLE AGENCY", "agency")
            rename(o, "UPDATED", "updated", Date.parse(o.UPDATED))
            remove(r, "description")
            remove(r, "link")
            remove(r, "guid_isPermaLink")
            remove(r, "pubDate")

            r.data = o
            all.push(r)
        })

        // Respond with results
        res.send({
            ok: true,
            total: features.length,
            search: results.length,
            fires: all
        })
    })
}
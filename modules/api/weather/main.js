"use strict"

const request = require("request")

module.exports = (server, body) => {
    let req = server.req
    let res = server.res
    let keys = server.keychain

    if (body.location) {
        let location = body.location
        let url = `https://api.darksky.net/forecast/${keys.forecast}/${location}?units=si`

        request(url, (error, response, body) => {
            if (response.statusCode === 200) {
                let data = JSON.parse(body)
                res.send({ ok: true, result: data })
                return
            } else if (error) {
                res.status(500).send({ ok: false, code: 500, error: "Internal Server Error" })
                throw error
            } else {
                res.status(500).send({ ok: false, code: 500, error: "Internal Server Error" })
                throw response.statusCode
            }
        })
    } else {
        res.send({ ok: false, error: "missing location" })
        return
    }
}

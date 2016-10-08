"use strict"

const request = require("request")
const ISO = require("iso-639-1")
const qs = require("qs")

let validate = (query) => {
    if (ISO.validate(query)) {
        return query
    } else {
        return ISO.getAllNames().indexOf(query) >= 0 ? ISO.getCode(query) : null
    }
}

module.exports = (server, body) => {
    let req = server.req
    let res = server.res

    let url = "http://translate.googleapis.com/translate_a/single?"

    let slicer = (query) => {
        return query
            .replace(/。/g, ". ")
            .replace(/、/g, ", ")
            .replace(/？/g, "? ")
            .replace(/！/g, "! ")
            .replace(/「/g, "\"")
            .replace(/」/g, "\" ")
            .replace(/　/g, " ")
    }

    if (!body.to || !body.query) {
        res.send({ ok: false, error: "missing fields" })
        return
    }

    if (!validate(body.to) || (body.from && !validate(body.from))) {
        res.send({ ok: false, error: "unknown language" })
        return
    }

    let to_lang = body.to
    let from_lang = body.from ? body.from : "auto"
    let query = slicer(body.query)

    let fetch = {
        headers: { "User-Agent": "Mozilla/5.0" },
        url: url + qs.stringify({
            client: "gtx",
            dt: "t",
            sl: from_lang,
            tl: to_lang,
            q: query
        })
    }

    request.get(fetch, (error, response, body) => {
        if (error) {
            res.status(500).send({ ok: false, code: 500, error: "Internal Server Error" })
            return error
        } else if (response.statusCode !== 200) {
            res.status(500).send({ ok: false, code: 500, error: "Internal Server Error" })
            return response.statusCode
        }

        try {
            let data = JSON.parse(body.replace(/\,+/g, ","))
            let translation = data[0][0][0]

            res.send({ ok: true, result: translation })

            return
        } catch(e) {
            console.error(e)
            res.send({ ok: false, error: "bad response" })
            return
        }
    })
}

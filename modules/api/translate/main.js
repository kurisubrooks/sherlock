"use strict";

const langs = require("./langs");
const qs = require("qs");

let validate = (query) => {
    let found = false;
    let match = {};

    langs.forEach((v, k) => {
        if (query.toLowerCase() === v.code) {
            found = true;
            match = v;
        }
    });

    return found ? match : null;
};

module.exports = (server, body) => {
    let res = server.res;
    let request = server.modules.request;

    let url = "http://translate.googleapis.com/translate_a/single?";

    let slicer = (query) => {
        return query
            .replace(/。/g, ". ")
            .replace(/、/g, ", ")
            .replace(/？/g, "? ")
            .replace(/！/g, "! ")
            .replace(/「/g, "\"")
            .replace(/」/g, "\" ")
            .replace(/　/g, " ");
    };

    if (!body.query) {
        res.send({ ok: false, error: "missing fields" });
        return;
    }

    if (body.to) {
        if (!validate(body.to)) {
            res.send({ ok: false, error: "unknown language in 'to' field" });
            return;
        }
    }

    if (body.from) {
        if (!validate(body.from)) {
            res.send({ ok: false, error: "unknown language in 'from' field" });
            return;
        }
    }

    let to_lang = body.to ? body.to : "en";
    let from_lang = body.from ? body.from : "auto";
    let query = slicer(body.query);

    let fetch = {
        headers: { "User-Agent": "Mozilla/5.0" },
        url: url + qs.stringify({
            client: "gtx",
            dt: "t",
            sl: from_lang,
            tl: to_lang,
            q: query
        })
    };

    request.get(fetch, (error, response, result) => {
        if (error) {
            res.status(500).send({ ok: false, code: 500, error: "Internal Server Error" });
            return error;
        } else if (response.statusCode !== 200) {
            res.status(500).send({ ok: false, code: 500, error: "Internal Server Error" });
            return response.statusCode;
        }

        try {
            let data = JSON.parse(result.replace(/\,+/g, ","));
            let to = validate(body.to ? body.to : "en");
            let from = validate(data[1]);
            let query = body.query;
            let translation = data[0][0][0];

            res.send({
                ok: true,
                to: to,
                from: from,
                query: query,
                result: translation
            });

            return;
        } catch(e) {
            console.error(e);
            res.send({ ok: false, error: "bad response" });
            return;
        }
    });
};

const langs = require("./langs.json");
const qs = require("qs");

let validate = query => {
    let found = false;
    let match = {};

    for (let item of langs) {
        if (query.toLowerCase() !== item.code) continue;
        found = true;
        match = item;
    }

    return found ? match : null;
};

module.exports = (server, body) => {
    let res = server.res;
    let { request } = server.modules;

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
        return res.send({ ok: false, error: "missing fields" });
    }

    if (body.to) {
        if (!validate(body.to)) {
            return res.send({ ok: false, error: "unknown language in 'to' field" });
        }
    }

    if (body.from) {
        if (!validate(body.from)) {
            return res.send({ ok: false, error: "unknown language in 'from' field" });
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

    return request.get(fetch, (error, response, result) => {
        if (error) {
            console.error(error);
            return res.sendStatus(500).send({ ok: false, code: 500, error: "Internal Server Error" });
        } else if (response.sendStatusCode !== 200) {
            console.error(response.sendStatusCode);
            return res.sendStatus(500).send({ ok: false, code: 500, error: "Internal Server Error" });
        }

        try {
            let data = JSON.parse(result.replace(/,+/g, ","));
            let to = validate(body.to ? body.to : "en");
            let from = validate(data[1]);
            let query = body.query;
            let translation = data[0][0][0];

            return res.send({
                ok: true,
                to: to,
                from: from,
                query: query,
                result: translation
            });
        } catch(err) {
            console.error(err);
            return res.sendStatus(500).send({ ok: false, code: 500, error: "Internal Server Error" });
        }
    });
};

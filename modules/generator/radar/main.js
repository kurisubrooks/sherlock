const GIF = require("gifencoder");
const Canvas = require("canvas");
const qs = require("qs");

module.exports = (server, data) => {
    let res = server.res;
    let { fs, path, request } = server.modules;

    let list = {
        adelaide: { id: "064", type: "radar", tz: "Australia/Adelaide" },
        sydney: { id: "071", type: "radarz", tz: "Australia/Sydney" }
    };

    let frames = data.frames ? Number(data.frames) : 8;
    let types = ["animated", "static"];
    let type = data.type ? data.type : "static";
    let place = data.id ? list[data.id] : list.sydney;

    if (data.frames) {
        if (data.frames > 18) {
            return res.sendStatus(400).send({ ok: false, code: 400, error: "maximum of 18 frames allowed" });
        }
    }

    if (data.type) {
        if (!types[types.indexOf(data.type)]) {
            return res.sendStatus(400).send({ ok: false, code: 400, error: "unknown image type" });
        }
    }

    if (data.id) {
        if (!place) {
            return res.sendStatus(400).send({ ok: false, code: 400, error: "unknown/unsupported location" });
        }
    }

    if (type === "static") {
        frames = 1;
    }

    let options = qs.stringify({
        "lt": "radar",
        "lc": place.id,
        "type": "radar",
        "mt": "radsat_640",
        "mlt": place.type,
        "mlc": place.id,
        "frames": frames,
        "md": "640x480",
        "radardimensions": "640x480",
        "df": "EEE HH:mm z",
        "tz": place.tz
    }, { indices: false });

    let url = `http://data.weatherzone.com.au/json/animator/?${options}`;

    return request.get({ url: url, json: true }, (err, response, data) => {
        if (err) throw err;

        const encoder = new GIF(640, 480);
        const canvas = new Canvas(640, 480);
        const ctx = canvas.getContext("2d");
        const Image = Canvas.Image;
        const frame = new Image();
        const terrain = new Image();
        const locations = new Image();

        terrain.src = fs.readFileSync(path.join(__dirname, "terrain", `${place.id}.jpg`));
        locations.src = fs.readFileSync(path.join(__dirname, "locations", `${place.id}.png`));

        if (type === "animated") {
            encoder.start();
            encoder.setRepeat(0);
            encoder.setDelay(220);
            encoder.setQuality(100);

            let count = 0;
            let frames = { };
            let requestQueue = [];

            data.frames.sort((a, b) => a - b);

            for (let i of data.frames) {
                let id = ++count;

                requestQueue.push(new Promise(resolve => {
                    request.get({ url: i.image, encoding: null }, (err, res, body) => {
                        if (err) throw err;

                        frames[id] = { radar: body, id: id, i: i };

                        return resolve();
                    });
                }));
            }

            return Promise.all(requestQueue).then(() => {
                for (let thisFrame of frames) {
                    frame.src = thisFrame.radar;

                    ctx.drawImage(terrain, 0, 0);
                    ctx.drawImage(frame, 0, 0);
                    ctx.drawImage(locations, 0, 0);
                    ctx.font = "16px sans-serif";
                    ctx.fillText(thisFrame.id, 628, 15);

                    if (thisFrame.id === count) encoder.setDelay(2250);
                    encoder.addFrame(ctx);
                }

                encoder.finish();
                res.type("gif");
                return res.end(encoder.out.getData());
            });
        } else if (type === "static") {
            return request.get({ url: data.frames[Number(frames) - 1].image, encoding: null }, (err, resp, body) => {
                if (err) throw err;

                frame.src = body;

                ctx.drawImage(terrain, 0, 0);
                ctx.drawImage(frame, 0, 0);
                ctx.drawImage(locations, 0, 0);

                res.type("png");
                return res.send(canvas.toBuffer());
            });
        } else {
            return res.sendStatus(400).send({ ok: false, code: 400, error: "unknown type" });
        }
    });
};

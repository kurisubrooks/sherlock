"use strict";

const GIF = require("gifencoder");
const Canvas = require("canvas");
const qs = require("qs");

module.exports = (server, data) => {
    let res = server.res;
    let request = server.modules.request;
    let path = server.modules.path;
    let fs = server.modules.fs;
    let _ = server.modules.lodash;

    let frames = 8;
    let list = { adelaide: ["064", "radar"], sydney: ["071", "radarz"] };
    let types = [ "animated", "static" ];
    let type = data.type ? data.type : "static";
    let id = data.id ? data.id : list.sydney;

    if (data.type) {
        if (!types[types.indexOf(data.type)]) {
            res.status(400).send({ ok: false, code: 400, error: "unknown image type" });
            return;
        }
    }

    if (data.id) {
        if (!list[data.id]) {
            res.status(400).send({ ok: false, code: 400, error: "unknown/unsupported location" });
            return;
        } else {
            id = list[data.id][0];
        }
    }

    let url = `http://data.weatherzone.com.au/json/animator/?` + qs.stringify({
        "lt": "radar",
        "lc": id,
        "type": "radar",
        "mt": "radsat_640",
        "mlt": list[data.id][1],
        "mlc": id,
        "frames": frames,
        "md": "640x480",
        "radardimensions": "640x480",
        "df": "EEE HH:mm z",
        "tz": "Australia/Sydney"
    }, { indices: false });

    request.get({ url: url, json: true }, (err, response, data) => {
        if (err) throw err;

        const encoder = new GIF(640, 480);
        const canvas = new Canvas(640, 480);
        const ctx = canvas.getContext("2d");
        const Image = Canvas.Image;
        const frame = new Image();
        const terrain = new Image();
        const locations = new Image();

        terrain.src = fs.readFileSync(path.join(__dirname, "terrain", id + ".jpg"));
        locations.src = fs.readFileSync(path.join(__dirname, "locations", id + ".png"));

        if (type === "animated") {
            encoder.start();
            encoder.setRepeat(0);    // 0 for repeat, -1 for no-repeat
            encoder.setDelay(220);   // frame delay in ms
            encoder.setQuality(100); // image quality. 10 is default.

            let count = 0;
            let frames = { };
            let requestQueue = [ ];

            data.frames.sort((a, b) => a - b);

            _.forEach(data.frames, (i) => {
                let id = ++count;

                //console.log(`GET #${id} - ${i.timestamp_string}`);

                requestQueue.push(new Promise((resolve, reject) => {
                    request.get({ url: i.image, encoding: null }, (err, res, body) => {
                        if (err) throw err;

                        frames[id] = { radar: body, id: id, i: i };
                        //console.log(`IMG #${id} - ${i.timestamp_string}`);

                        resolve();
                    });
                }));
            });

            Promise.all(requestQueue).then(() => {
                //console.log(`Got ${requestQueue.length} frames total`);

                _.forEach(frames, (thisFrame) => {
                    frame.src = thisFrame.radar;

                    ctx.drawImage(terrain, 0, 0);
                    ctx.drawImage(frame, 0, 0);
                    ctx.drawImage(locations, 0, 0);
                    ctx.font = "16px sans-serif";
                    ctx.fillText(thisFrame.id, 628, 15);

                    //console.log(`ADD #${thisFrame.id} - ${thisFrame.i.timestamp_string}`);

                    if (thisFrame.id === count) encoder.setDelay(2250);
                    encoder.addFrame(ctx);
                });

                encoder.finish();
                res.type("gif");
                res.end(encoder.out.getData());
            });
        } else {
            request.get({ url: data.frames[Number(frames) - 1].image, encoding: null }, (err, resp, body) => {
                if (err) throw err;

                frame.src = body;

                ctx.drawImage(terrain, 0, 0);
                ctx.drawImage(frame, 0, 0);
                ctx.drawImage(locations, 0, 0);

                res.type("png");
                res.send(canvas.toBuffer());
            });
        }
    });
};

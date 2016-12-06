"use strict";

const GIF = require("gifencoder");
const Canvas = require("canvas");
const qs = require("qs");

let url = `http://data.weatherzone.com.au/json/animator/?` + qs.stringify({
    "lt": "radar",
    "lc": "071",
    "type": "radar",
    "mt": "radsat_640",
    "mlt": "radarz",
    "mlc": "071",
    "frames": "8",
    "md": "640x480",
    "radardimensions": "640x480",
    "df": "EEE HH:mm z",
    "tz": "Australia/Sydney"
}, { indices: false });

module.exports = (server, data) => {
    let res = server.res;
    let request = server.modules.request;
    let path = server.modules.path;
    let fs = server.modules.fs;
    let _ = server.modules.lodash;

    request.get({ url: url, json: true }, (err, response, data) => {
        if (err) throw err;

        const encoder = new GIF(640, 480);
        const canvas = new Canvas(640, 480);
        const ctx = canvas.getContext("2d");
        const Image = Canvas.Image;
        const frame = new Image();
        const terrain = new Image();
        const locations = new Image();

        terrain.src = fs.readFileSync(path.join(__dirname, "terrain.jpg"));
        locations.src = fs.readFileSync(path.join(__dirname, "locations.png"));

        encoder.start();
        encoder.setRepeat(0);   // 0 for repeat, -1 for no-repeat
        encoder.setDelay(200);  // frame delay in ms
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
    });
};

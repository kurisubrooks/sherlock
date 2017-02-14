const epicenters = require("./epicenters.json");
const request = require("request");
const Canvas = require("canvas");
const path = require("path");
const qs = require("qs");
const fs = require("fs");

//   data format (encode to base64)
// { "l": [34.3,141.9], "e": 472, "m": 5, "s": "2", "d": 10, "p": 1 }

module.exports = (server, data) => {
    let res = server.res;

    try {
        data = JSON.parse(Buffer.from(data.data, "base64").toString());
    } catch(err) {
        return res.sendStatus(400).send({ ok: false, code: 400, error: "malformed data" });
    }

    let location = data.l;
    let epicenter = Number(data.e);
    let magnitude = Number(data.m);
    let seismic = data.s;
    let depth = Number(data.d);

    if (!(location && epicenter && magnitude && seismic && depth)) {
        return res.send({ ok: false, error: "missing params" });
    }

    let options = qs.stringify({
        size: "386x159",
        center: location.join(","),
        format: "png",
        scale: 1,
        zoom: 6,
        style: [
            "feature:road|element:all|visibility:off",
            "feature:water|element:all|color:0x222222",
            "feature:landscape|element:geometry|color:0x3B3B3B",
            "feature:administrative|element:labels.text.fill|color:0x000000",
            "feature:administrative|element:labels.text.stroke|color:0xFFFFFF",
            "feature:administrative|element:labels.text|lightness:-50",
            "feature:poi.park|element:all|visibility:off"
        ]
    }, { indices: false });

    let url = `https://maps.googleapis.com/maps/api/staticmap?${options}`;

    return request.get({ url: url, encoding: "binary" }, (err, response, body) => {
        if (err) throw err;

        let canvas = new Canvas(400, 280);
        let ctx = canvas.getContext("2d");
        let Image = Canvas.Image;
        let Font = Canvas.Font;
        let map = new Image();
        let base = new Image();
        let epic = new Image();
        let Roboto = new Font("Roboto", path.join(__dirname, "Roboto.ttf"));

        map.src = new Buffer(body, "binary");
        base.src = fs.readFileSync(path.join(__dirname, "card.png"));
        epic.src = fs.readFileSync(path.join(__dirname, "epicenter.png"));

        // Draw Image
        ctx.drawImage(base, 0, 0);
        ctx.drawImage(map, 7, 73);
        ctx.drawImage(epic, 386 / 2 - (28 / 2) + 7, 159 / 2 - (28 / 2) + 73);
        ctx.scale(1, 1);
        ctx.patternQuality = "bilinear";
        ctx.filter = "bilinear";
        ctx.antialias = "subpixel";

        // Epicenter
        ctx.font = "17px Roboto";
        ctx.fillStyle = "#FFF";
        ctx.fillText(epicenters[epicenter] ? epicenters[epicenter].en : `Unknown Location (${epicenter})`, 20, 35);

        // Details
        ctx.font = "15px Roboto";
        ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
        ctx.fillText(`Magnitude ${data.m}, Seismic ${data.s}, Depth ${data.d}km`, 20, 58);

        // Footer
        ctx.font = "15px Roboto";
        ctx.fillStyle = "#000";
        ctx.fillText("Information is preliminary", 56, 257);

        res.type("png");
        return res.end(canvas.toBuffer());
    });
};

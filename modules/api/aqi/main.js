module.exports = (server, args) => {
    let res = server.res;
    let { request } = server.modules;

    if (!args.id) args.id = "3255";

    let fetch = {
        headers: { "User-Agent": "Mozilla/5.0" },
        url: `http://waqi.info/api/widget/${args.id}/widget.v1.json`
    };

    request.get(fetch, (error, response, body) => {
        if (error) {
            console.error(error);
            return res.status(503).send({ ok: false, code: 503, error: "Service Unavailable" });
        } else if (response.statusCode !== 200) {
            console.error(error);
            return res.status(503).send({ ok: false, code: 503, error: "Service Unavailable" });
        }

        let init, sauce;

        try {
            init = JSON.parse(body);
            sauce = init.rxs.obs[0].msg;
        } catch(err) {
            console.error(err);
            return res.status(500).send({ ok: false, code: 500, error: "Internal Server Error" });
        }

        if (sauce) {
            let data = {
                value: sauce.model.aqi,
                location: sauce.model.city.name,
                title: "Unknown",
                index: -1,
                style: "#444444"
            };

            if (data.value > 0 && data.value <= 25) {
                data.index = 0;
                data.title = "Very Good";
                data.style = "#1D87E4";
            } else if (data.value >= 26 && data.value <= 50) {
                data.index = 1;
                data.title = "Good";
                data.style = "#4CAF50";
            } else if (data.value >= 51 && data.value <= 99) {
                data.index = 2;
                data.title = "Fair";
                data.style = "#FAA800";
            } else if (data.value >= 100 && data.value <= 149) {
                data.index = 3;
                data.title = "Poor";
                data.style = "#E53935";
            } else if (data.value >= 150 && data.value <= 199) {
                data.index = 4;
                data.title = "Very Poor";
                data.style = "#BB1410";
            } else if (data.value >= 200) {
                data.index = 5;
                data.title = "Hazardous";
                data.style = "#7D57C1";
            } else {
                data.index = -1;
                data.title = "Unknown";
                data.style = "#444444";
            }

            return res.send({
                ok: true,
                location: {
                    id: Number(args.id),
                    place: data.location
                },
                aqi: {
                    index: data.index,
                    value: data.value,
                    level: data.title,
                    color: data.style
                }
            });
        } else {
            return res.status(504).send({ ok: false, code: 503, error: "Service Unavailable" });
        }
    });
};

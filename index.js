// modules
const request = require("request");
const moment = require("moment");
const crypto = require("crypto");
const chalk = require("chalk");
const path = require("path");
const fs = require("fs");

// server
const express = require("express");
const postman = require("body-parser");
const app = express();

const privateKey = fs.readFileSync(path.join(__dirname, "secure", "api.kurisubrooks.com.key"), "utf8");
const certificate = fs.readFileSync(path.join(__dirname, "secure", "api.kurisubrooks.com.crt"), "utf8");
const credentials = { key: privateKey, cert: certificate };

const http = require("http").createServer(app);
const https = require("https").createServer(credentials, app);
const socket = require("socket.io");
const io = socket(https);

// internal
const database = require("./database.json");
const keychain = require("./keychain.json");
const config = require("./config");

// config express
app.use(postman.json());
app.use(postman.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use("/static", express.static("static"));

// helper functions
let token = count =>
    crypto.randomBytes(Math.ceil(count / 2)).toString("hex").slice(0, count);

let error = (res, err) => {
    if (res) res.send({ ok: false, error: err });
};

let get = val => {
    request(val.url, (err, res, body) => {
        if (err || res.statusCode !== 200) {
            console.error(`Unable to GET ${val.name}.${val.format}, retrying in ${val.interval} minutes`);
            return console.error(err || res.statusCode);
        }

        if (!body || body === undefined || body === null || body === "" || body === "{}" || body === {}) {
            console.info(`Result from ${val.name} was undefined`);
            return console.info(body);
        }

        if (val.format === "json") body = JSON.parse(body);

        return fs.writeFile(path.join(dataStore, `${val.name}.${val.format}`), JSON.stringify({
            ok: true,
            updated: moment().unix(),
            data: body
        }, null, 4), (err) => {
            if (err) {
                console.error(chalk.red(`Unable to save ${val.name}.${val.format}`));
                console.error(err);
            }
        });
    });
};

let run = (req, res, type, endpoint, data) => {
    try {
        let location = path.join(__dirname, "modules", type, endpoint, "main.js");
        return require(location)({
            storage: path.join(__dirname, "storage"),
            req, res, io, keychain,
            modules: { fs, path, moment, request, crypto, chalk }
        }, data);
    } catch(error) {
        console.error(error);
        return res.status(500).send({ ok: false, code: 500, error: "Internal Server Error" });
    }
};

// subprocess data handler & setup
let dataStore = path.join(__dirname, "storage");

fs.access(dataStore, fs.F_OK, err => {
    if (err) fs.mkdirSync(dataStore);
});

// start data-getters
for (let key of Object.keys(config.data)) {
    let val = config.data[key];
    setInterval(() => get(val), val.interval * 60 * 1000);
    get(val);
}

// websocket
io.on("connection", socket => {
    let ip = socket.request.connection.remoteAddress.replace("::ffff:", "");

    console.log(chalk.yellow(ip), chalk.green(`Connected to Socket`));

    socket.on("ping", () => socket.emit("pong"));
    socket.on("disconnect", () => {
        console.log(chalk.yellow(ip), chalk.red(`Disconnected from Socket`));
    });
});

// web server
app.all("*", (req, res, next) => {
    let ip = req.ip.replace("::ffff:", "");
    let data = Object.keys(req.body).size ? req.body : req.query;
    let log = `${ip} ${req.params[0]} ${data ? JSON.stringify(data) : ""}`;

    // Handle HTTPS Redirect
    if (req.secure) {
        // Set Headers
        res.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
        res.set("Access-Control-Allow-Origin", "*");

        // Log HTTP Request
        console.log(chalk.green(log));

        // Match URL
        return next();
    }

    return res.redirect(`https://${req.hostname}${req.url}`);
});

app.all("/api/:path", (req, res) => {
    let data = Object.keys(req.body).size ? req.body : req.query;

    if (req.params) {
        let type;

        // module types
        if (req.params.path in config.api) {
            type = "api";
        } else if (req.params.path in config.generator) {
            type = "generator";
        }

        // check if doesn't endpoint exist
        if (!type) {
            return error(res, "endpoint doesn't exist");
        }

        // if token not required
        if (!config[type][req.params.path].token) {
            return run(req, res, type, req.params.path, data);
        }

        // token missing
        if (!data.token) {
            return error(res, "token required");
        }

        // invalid token
        if (!(data.token in database)) {
            return error(res, "invalid token");
        }

        return run(req, res, type, req.params.path, data);
    }

    return null;
});

app.all("/api*", (req, res) => res.send({ ok: false, error: "missing endpoint" }));

// err handling
app.use((err, req, res) => {
    console.error(err.stack);
    return res.status(500).send({ ok: false, code: 500, error: "Internal Server Error" });
});

// 404
app.use((req, res) => res.status(404).send({ ok: false, code: 404, error: "Not Found" }));

// start server
http.listen(80, console.log(chalk.green(`Server Started on`), chalk.yellow(`Port 80`)));
https.listen(443, console.log(chalk.green(`Server Started on`), chalk.yellow(`Port 443`)));

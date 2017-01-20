"use strict";

// modules
const request = require("request");
const moment = require("moment");
const crypto = require("crypto");
const chalk = require("chalk");
const path = require("path");
const fs = require("fs");
const _ = require("lodash");

// server
const express = require("express");
const postman = require("body-parser");
const cors = require("cors");
const app = express();

const privateKey  = fs.readFileSync(path.join(__dirname, "secure", "api.kurisubrooks.com.key"), "utf8");
const certificate = fs.readFileSync(path.join(__dirname, "secure", "api.kurisubrooks.com.crt"), "utf8");
const credentials = { key: privateKey, cert: certificate };

const http = require("http");
const https = require("https");
const serve1 = http.createServer(app);
const serve2 = https.createServer(credentials, app);
const socket = require("socket.io");
const io = socket(serve2);

// internal
const database = require("./database.json");
const keychain = require("./keychain.json");
const config = require("./config");

// helper functions
let token = (count) =>
    crypto.randomBytes(Math.ceil(count / 2)).toString("hex").slice(0, count);

let error = (res, err) => {
    if (res) res.send({ ok: false, error: err });
};

let get = (val) => {
    request(val.url, (err, res, body) => {
        if (err || res.statusCode !== 200) {
            console.error(`Unable to GET ${val.name}.${val.format}, retrying in ${val.interval * 60 * 1000} minutes`);
            console.error(err || res.statusCode);
            return;
        }

        if (body === undefined || body === null || body === void 0 || body === "" || body === "{}" || body === {}) {
            console.info(`Result from ${val.name} was undefined`);
            console.info(body);
            return;
        }

        if (val.format === "json") body = JSON.parse(body);

        fs.writeFile(path.join(dataStore, `${val.name}.${val.format}`), JSON.stringify({
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
        let module = require(location)({
            storage: path.join(__dirname, "storage"),
            req: req,
            res: res,
            io: io,
            keychain: keychain,
            modules: { fs: fs, path: path, lodash: _, moment: moment, request: request, crypto: crypto, chalk: chalk }
        }, data);
    } catch(error) {
        console.log(chalk.red(error));
        res.status(500).send({ ok: false, code: 500, error: "Internal Server Error" });
        return;
    }
};

// express config
app.use(cors());
app.use(postman.json());
app.use(postman.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use("/static", express.static("static"));

// subprocess data handler & setup
let dataStore = path.join(__dirname, "storage");

fs.access(dataStore, fs.F_OK, (err) => {
    if (err) fs.mkdirSync(dataStore);
});

// start subprocesses
_.each(config.data, (val) => {
    setInterval(() => get(val), val.interval * 60 * 1000);
    get(val);
});

// websocket
io.on("connection", (socket) => {
    let ip = (socket.request.connection.remoteAddress).replace("::ffff:", "");
    console.log(chalk.yellow(ip), chalk.green(`Connected to Socket`));

    socket.on("ping", () => socket.emit("pong"));

    socket.on("disconnect", () => {
        console.log(chalk.yellow(ip), chalk.red(`Disconnected from Socket`));
    });
});

// web server
app.all("*", (req, res, next) => {
    let ip = req.ip.replace("::ffff:", "");
    let data = _.isEmpty(req.body) ? req.query : req.body;
    let log = `${ip} ${req.params[0]} ${data ? JSON.stringify(data) : ""}`;

    // Handle HTTPS Redirect
    if (req.secure) {
        // Set Headers
        res.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");

        // Log HTTP Requests
        console.log(chalk.green(log));

        // Match URL
        return next();
    }

    res.redirect(`https://${req.hostname}${req.url}`);
});

app.all("/api/:path", (req, res) => {
    let data = _.isEmpty(req.body) ? req.query : req.body;

    if (req.params) {
        let type;

        // module types
        if (req.params.path in config.api) {
            type = "api";
        } else if (req.params.path in config.generator) {
            type = "generator";
        }

        // endpoint exists
        if (type) {
            // check if endpoint requires token
            if (config[type][req.params.path].token) {
                // check if token was provided
                if (data.token) {
                    // check if token is valid
                    if (data.token in database) {
                        run(req, res, type, req.params.path, data);
                    } else {
                        error(res, "invalid token");
                    }
                } else {
                    error(res, "token required");
                }
            } else {
                run(req, res, type, req.params.path, data);
            }
        } else {
            error(res, "endpoint doesn't exist");
        }
    }
});

app.all("/api*", (req, res) => res.send({ ok: false, error: "missing endpoint" }));

// err handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send({ ok: false, code: 500, error: "Internal Server Error" });
});

// 404
app.use((req, res, next) => res.status(404).send({ ok: false, code: 404, error: "Not Found" }));

// start server
serve1.listen(80, console.log(chalk.green(`Server Started on`), chalk.yellow(`Port 80`)));
serve2.listen(443, console.log(chalk.green(`Server Started on`), chalk.yellow(`Port 443`)));

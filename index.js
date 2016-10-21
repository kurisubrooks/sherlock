"use strict"

// modules
const request = require("request")
const moment = require("moment")
const crypto = require("crypto")
const chalk = require("chalk")
const path = require("path")
const fs = require("fs")
const _ = require("lodash")

// server
const express = require("express")
const postman = require("body-parser")
const cors = require("cors")
const app = express()

const http = require("http").Server(app)
const socket = require("socket.io")
const io = socket(http)

// internal
const database = require("./database.json")
const keychain = require("./keychain.json")
const config = require("./config")
const sudo = process.getuid && process.getuid() === 0
const port = config.port

// helper functions
let token = (count) =>
    crypto.randomBytes(Math.ceil(count / 2)).toString("hex").slice(0, count)

let error = (res, err, log) => {
    if (log) console.log(chalk.red(log))
    if (res) res.send({ ok: false, error: err })
}

let run = (req, res, type, endpoint, data, log) => {
    if (log) console.log(chalk.green(log))
    let location = path.join(__dirname, "modules", type, endpoint, "main.js")
    let module = require(location)({
        storage: path.join(__dirname, "storage"),
        req: req, 
        res: res, 
        io: io,
        keychain: keychain,
        modules: {
            fs: fs,
            path: path,
            lodash: _,
            moment: moment,
            request: request,
            crypto: crypto,
            chalk: chalk
        }
    }, data)
}

// express config
app.use(cors())
app.use(postman.json())
app.use(postman.urlencoded({ extended: true }))
app.use(express.static("public"))
app.use("/static", express.static("static"))

// subprocess data handler & setup
let dataStore = path.join(__dirname, "storage")

fs.access(dataStore, fs.F_OK, (err) => {
    if (err) fs.mkdirSync(dataStore)
})

let getData = () => {
    _.each(config.data, (val) => {
        request(val.url, (err, res, body) => {
            if (err || res.statusCode !== 200) return
            if (body === undefined || body === null || body === void 0 || body === "") return
            if (val.format === "json") body = JSON.parse(body)

            fs.writeFile(path.join(dataStore, `${val.name}.${val.format}`), JSON.stringify({
                ok: true,
                updated: moment().unix(),
                data: body
            }, null, 4), (err) => {
                if (err) throw err
                console.log(`Saved ${val.name}.${val.format}`)
            })
        })
    })
}

setInterval(() => getData(), 5 * 60 * 1000)
getData()

// api handling
app.all("/api/:path", (req, res) => {
    let data = _.isEmpty(req.body) ? req.query : req.body
    let ip = req.ip.replace("::ffff:", "")

    if (req.params) {
        let log = `${ip} ${req.params.path} ${JSON.stringify(data)}`
        let type

        // module types
        if (req.params.path in config.api)
            type = "api"
        else if (req.params.path in config.generator)
            type = "generator"

        // endpoint exists
        if (type)
            // check if endpoint requires token
            if (config[type][req.params.path].token)
                // check if token was given
                if (data.token)
                    // check if token is valid
                    if (data.token in database)
                        run(req, res, type, req.params.path, data, log)
                    // token is not valid
                    else
                        error(res, "invalid token", log)
                // token was not given
                else
                    error(res, "token required", log)
            // token not required, run
            else
                run(req, res, type, req.params.path, data, log)
        // endpoint doesn't exist
        else
            error(res, "endpoint doesn't exist", log)
    }
})

app.all("/api*", (req, res) => res.send({ ok: false, error: "missing endpoint" }))

// err handling
app.use((err, req, res, next) => {
    console.error(err.stack)
    res.status(500).send({ ok: false, code: 500, error: "Internal Server Error" })
})

// 404
app.use((req, res, next) => res.status(404).send({ ok: false, code: 404, error: "Not Found" }))

// start server
http.listen(port, console.log(`Server Started on Port ${port}`))

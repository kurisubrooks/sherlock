"use strict"

module.exports = (server, body) => {
    let req = server.req
    let res = server.res
    let socket = server.io

    res.send({ coming: "soon" })
}

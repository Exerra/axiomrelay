import Elysia from "elysia";
import { libsql } from "..";
import env from "../util/env";
import html from "@elysiajs/html";

export const webpages = new Elysia()

webpages.use(html())

webpages.get("/", async () => {
    const base = `https://${env.hostname}`
    
    let connectedInstances = await libsql.execute({
        sql: "SELECT hostname FROM instances",
        args: []
    })

    let variables = {
        connectedInstances: connectedInstances.rows.map(hostname => `<tr><td>${hostname.hostname}</td></tr>`).join("\n"),
        hostname: env.hostname,
        connectedInstancesCount: connectedInstances.rows.length,
        whichlist: env.allowlistOnly ? "whitelist only. Instances will have to be pre-approved." : "public.",
        base: base,
        adminUsername: env.adminUsername,
        adminURL: env.adminURL
    }

    console.log(connectedInstances)

    let template = Bun.file("./src/templates/index.html")
    let html = await template.text()

    for (let key of Object.keys(variables)) {
        html = html.replaceAll(`{%${key}%}`, variables[key])
    }

    return html
})

webpages.get("/style.css", async ({ set }) => {
    let cssFile = Bun.file("./src/templates/styles/index.css")

    set.headers["content-type"] = "text/css; charset=utf-8"

    return await cssFile.text()
})
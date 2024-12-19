import Elysia from "elysia";
import { db } from "..";
import env from "../util/env";
import html from "@elysiajs/html";

export const webpages = new Elysia()

webpages.use(html())

webpages.get("/", async () => {
    const base = `https://${env.hostname}`

    let connectedQuery = db.query("SELECT hostname FROM instances")
    let connectedInstances = connectedQuery.all() as { hostname: string }[]

    let relayQuery = db.query("SELECT hostname FROM relays")
    let subscribedRelays = relayQuery.all() as { hostname: string }[]

    let variables: { [key: string]: string | number | undefined } = {
        connectedInstances: connectedInstances.map(hostname => `<tr><td>${hostname.hostname}</td></tr>`).join("\n"),
        hostname: env.hostname,
        connectedInstancesCount: connectedInstances.length,
        whichlist: env.allowlistOnly ? "whitelist only. Instances will have to be pre-approved." : "public.",
        base: base,
        adminUsername: env.adminUsername,
        adminURL: env.adminURL,
        subscribedRelaysCount: subscribedRelays.length,
        subscribedRelays: subscribedRelays.map(hostname => `<tr><td>${hostname.hostname}</td></tr>`).join("\n")
    }

    let template = Bun.file("./src/templates/index.html")
    let html = await template.text()

    for (let key of Object.keys(variables)) {
        html = html.replaceAll(`{%${key}%}`, variables[key] as string)
    }

    return html
})

webpages.get("/style.css", async ({ set }) => {
    let cssFile = Bun.file("./src/templates/styles/index.css")

    set.headers["content-type"] = "text/css; charset=utf-8"

    return await cssFile.text()
})
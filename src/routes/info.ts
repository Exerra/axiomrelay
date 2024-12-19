import Elysia from "elysia";
import env from "../util/env";
import { db, packageJson } from "..";
import { getModules } from "../util/modules";

export const info = new Elysia()

info.get("/.well-known/webfinger", ({ query, request, set }) => {
    const { resource } = query

    const url = new URL(request.url)

    url.protocol = "https"
    
    // const base = `${url.protocol}//${url.hostname}${url.port ? ":" + url.port : ""}`

    const base = `https://${env.hostname}`

    set.headers["content-type"] = `application/ld+json`

    return {
        aliases: [
            `${base}/actor`
        ],
        links: [
            {
                rel: "self",
                href: base + `/actor`,
                type: "application/activity+json"
            },
            {
                rel: "self",
                href: base + `/actor`,
                type: "application/ld+json"
            }
        ],
        subject: resource
    }
})

info.get("/.well-known/nodeinfo", ({ request }) => {
    const base = `https://${env.hostname}`

    return {
        links: [
            {
                rel: "http://nodeinfo.diaspora.software/ns/schema/2.0",
                href: base + "/nodeinfo/2.0.json"
            }
        ]
    }
})

info.get("/nodeinfo/2.0.json", async () => {
    let connectedQuery = db.query("SELECT hostname FROM instances")
    let connectedInstances = connectedQuery.all() as { hostname: string }[]

    let blockedQuery = db.query("SELECT hostname FROM blacklist")
    let blockedInstances = blockedQuery.all() as { hostname: string }[]

    return {
        version: "2.0",
        software: {
            name: "AxiomRelay",
            version: "v" + packageJson.version
        },
        protocols: [
            "activitypub"
        ],
        services: {
            inbound: [],
            outbound: []
        },
        openRegistrations: false,
        usage: {
            users: {
                total: 1,
                activeHalfyear: 1,
                activeMonth: 1
            },
            localPosts: 0,
            localComments: 0
        },
        metadata: {
            peers: connectedInstances.map(item => item.hostname),
            blocks: blockedInstances.map(item => item.hostname),
            loadedModules: (await getModules()).active.map(module => ({
                name: module.name || null,
                version: module.version || null,
                sourceCode: module.sourceCode || null
            }))
        }
    }
})
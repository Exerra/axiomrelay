import { Telegraf } from "telegraf"
import env from "./env"
import { db, packageJson } from ".."
import { generateDigestHeader } from "./signer"
import { signHeaders } from "./signatures"
import { randomUUID } from "node:crypto"

const startText = `Welcome! Domains in commands are seperated with a space.

These commands administrate the relay:
/start - Displays this text
/help - Displays this text
/allow - Adds domains to the whitelist
/block - Adds domains to the blacklist
/unallow - Removes domains from the whitelist
/unblock - Removes domains from the blacklist
/listconnected - Lists connected instances
/whitelist - Shows all instances in the whitelist
/blacklist - Shows all instances in the blacklist
/subscribe - Subscribes to another relay
/unsubscribe - Unsubscribes from relay (requires just a domain)`

export const initTelegram = async () => {
    const client = new Telegraf(env.telegram.apiKey!)

    client.command("subscribe", async (ctx) => {
        const { payload, from } = ctx

        const base = `https://${env.hostname}`

        if (!env.telegram.adminUsers.includes(from.username)) {
            ctx.reply("You are not a part of the admin user list")
            return
        }

        if (payload == "") return ctx.reply("[❌] No URL(s) specified.")

        let urls = ctx.payload.split(" ")

        for (let url of urls) {
            let activity = {
                id: "https://fedi.exerra.xyz/activities/follow-relay/" + randomUUID(),
                type: "Follow",
                actor: base + "/actor",
                object: "https://www.w3.org/ns/activitystreams#Public",
                published: new Date().toISOString()
            }
    
            const headersForSignage = {
                "Content-Type": "aplication/activity+json",
                host: new URL(url).hostname,
                date: new Date().toISOString(),
                digest: await generateDigestHeader(JSON.stringify(activity)),
                "User-Agent": "AxiomRelay/" + packageJson.version
            }
    
            const req = await fetch(url, {
                method: "POST",
                headers: await signHeaders("post " + new URL(url).pathname, headersForSignage, [ "host", "date", "digest" ]),
                body: JSON.stringify(activity)
            })
    
    
            if (req.status > 300) {
                ctx.reply(`[❌] Relay ${url} responded with ${req.status} - ${req.statusText}`)
                continue
            }

            await db.run("INSERT INTO relays (hostname, inboxurl, activity) VALUES (?, ?, ?)", [ new URL(url).hostname, url, JSON.stringify(activity) ])

            ctx.reply("[✅] Subcribed to relay " + url)
        }

        ctx.react("👍")
    })

    client.command("unsubscribe", async (ctx) => {
        const { payload, from } = ctx

        const base = `https://${env.hostname}`

        if (!env.telegram.adminUsers.includes(from.username)) {
            ctx.reply("You are not a part of the admin user list")
            return
        }

        if (payload == "") return ctx.reply("[❌] No domain(s) specified.")

        let domains = ctx.payload.split(" ")

        for (let domain of domains) {
            let query = db.query("SELECT hostname, inboxurl, activity FROM relays WHERE hostname = ?")
            let relay = query.get(domain) as { hostname: string, inboxurl: string, activity: string }

            let hostname = relay.hostname
            let inbox = relay.inboxurl
            let followActivity = JSON.parse(relay.activity)
            delete followActivity.published

            let activity = {
                type: "Undo",
                id: followActivity.id + "/undo",
                actor: base + "/actor",
                object: followActivity,
                published: new Date().toISOString()
            }
    
            const headersForSignage = {
                "Content-Type": "aplication/activity+json",
                host: hostname,
                date: new Date().toISOString(),
                digest: await generateDigestHeader(JSON.stringify(activity)),
                "User-Agent": "AxiomRelay/" + packageJson.version
            }
    
            const req = await fetch(inbox, {
                method: "POST",
                headers: await signHeaders("post " + new URL(inbox).pathname, headersForSignage, [ "host", "date", "digest" ]),
                body: JSON.stringify(activity)
            })
    
    
            if (req.status > 300) {
                ctx.reply(`[❌] Relay ${hostname} responded with ${req.status} - ${req.statusText}`)
                continue
            }

            await db.run("DELETE FROM relays WHERE hostname = ?", [ hostname ])

            ctx.reply("[✅] Unsubscribed from relay " + hostname)
        }

        ctx.react("👍")
    })

    client.start((ctx) => {
        const { from } = ctx
        if (!env.telegram.adminUsers.includes(from.username)) {
            ctx.reply("You are not a part of the admin user list")
            return
        }

        ctx.reply(startText)
    })

    client.command("help", async (ctx) => {
        const { from } = ctx
        if (!env.telegram.adminUsers.includes(from.username)) {
            ctx.reply("You are not a part of the admin user list")
            return
        }

        ctx.reply(startText)
    })

    client.command("allow", async (ctx) => {
        const { payload, from } = ctx

        if (!env.telegram.adminUsers.includes(from.username)) {
            ctx.reply("You are not a part of the admin user list")
            return
        }

        if (payload == "") return ctx.reply("[❌] No domain(s) specified.")

        let domains = ctx.payload.split(" ")

        for (let domain of domains) {
            await db.run("INSERT INTO whitelist (hostname) VALUES (?)", [domain])
        }

        ctx.reply("[✅] Added the following domains to the whitelist - " + domains.join(", "))

    })

    client.command("unallow", async (ctx) => {
        const { payload, from } = ctx

        if (!env.telegram.adminUsers.includes(from.username)) {
            ctx.reply("You are not a part of the admin user list")
            return
        }

        if (payload == "") return ctx.reply("[❌] No domain(s) specified.")

        let domains = ctx.payload.split(" ")

        for (let domain of domains) {
            await db.run("DELETE FROM whitelist WHERE hostname = ?", [domain])
        }

        ctx.reply("[✅] Removed the following domains from the whitelist - " + domains.join(", "))

    })

    client.command("block", async (ctx) => {
        const { payload, from } = ctx

        if (!env.telegram.adminUsers.includes(from.username)) {
            ctx.reply("You are not a part of the admin user list")
            return
        }

        if (payload == "") return ctx.reply("[❌] No domain(s) specified.")

        let domains = ctx.payload.split(" ")

        for (let domain of domains) {
            await db.run("INSERT INTO blacklist (hostname) VALUES (?)", [domain])
        }

        ctx.reply("[✅] Added the following domains to the blacklist - " + domains.join(", "))

    })

    client.command("unblock", async (ctx) => {
        const { payload, from } = ctx

        if (!env.telegram.adminUsers.includes(from.username)) {
            ctx.reply("You are not a part of the admin user list")
            return
        }

        if (payload == "") return ctx.reply("[❌] No domain(s) specified.")

        let domains = ctx.payload.split(" ")
        
        for (let domain of domains) {
            await db.run("DELETE FROM blacklist WHERE hostname = ?", [domain])
        }

        ctx.reply("[✅] Removed the following domains from the blacklist - " + domains.join(", "))
    })

    client.command("listconnected", async (ctx) => {
        const { from } = ctx
        if (!env.telegram.adminUsers.includes(from.username)) {
            ctx.reply("You are not a part of the admin user list")
            return
        }

        let query = db.query("SELECT hostname FROM instances")

        let data = query.all() as { hostname: string }[]

        ctx.reply(data.map(({ hostname }) => `${hostname}`).join("\n")) 
    })

    client.command("whitelist", async (ctx) => {
        const { from } = ctx
        if (!env.telegram.adminUsers.includes(from.username)) {
            ctx.reply("You are not a part of the admin user list")
            return
        }

        let query = db.query("SELECT hostname FROM whitelist")

        let data = query.all() as { hostname: string }[]

        ctx.reply(data.map(({ hostname }) => `${hostname}`).join("\n")) 
    })

    client.command("blacklist", async (ctx) => {
        const { from } = ctx
        if (!env.telegram.adminUsers.includes(from.username)) {
            ctx.reply("You are not a part of the admin user list")
            return
        }

        let query = db.query("SELECT hostname FROM blacklist")

        let data = query.all() as { hostname: string }[]

        ctx.reply(data.map(({ hostname }) => `${hostname}`).join("\n")) 
    })

    client.launch()

    console.log("[TELEGRAM] Started bot.")

    return client
}
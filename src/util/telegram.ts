import { Telegraf } from "telegraf"
import env from "./env"
import { libsql } from ".."

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
/blacklist - Shows all instances in the blacklist`

export const initTelegram = async () => {
    const client = new Telegraf(env.telegram.apiKey!)

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
        console.log(ctx.from)
        const { payload, from } = ctx

        if (!env.telegram.adminUsers.includes(from.username)) {
            ctx.reply("You are not a part of the admin user list")
            return
        }

        if (payload == "") return ctx.reply("[❌] No domain(s) specified.")

        let domains = ctx.payload.split(" ")

        let sql = await libsql.batch(domains.map(domain => ({
            sql: "INSERT INTO whitelist (hostname) VALUES (?)",
            args: [domain]
        })))

        ctx.reply("[✅] Added the following domains to the whitelist - " + domains.join(", "))

    })

    client.command("unallow", async (ctx) => {
        console.log(ctx.from)
        const { payload, from } = ctx

        if (!env.telegram.adminUsers.includes(from.username)) {
            ctx.reply("You are not a part of the admin user list")
            return
        }

        if (payload == "") return ctx.reply("[❌] No domain(s) specified.")

        let domains = ctx.payload.split(" ")

        let sql = await libsql.batch(domains.map(domain => ({
            sql: "DELETE FROM whitelist WHERE hostname = ?",
            args: [domain]
        })))

        ctx.reply("[✅] Removed the following domains from the whitelist - " + domains.join(", "))

    })

    client.command("block", async (ctx) => {
        console.log(ctx.from)
        const { payload, from } = ctx

        if (!env.telegram.adminUsers.includes(from.username)) {
            ctx.reply("You are not a part of the admin user list")
            return
        }

        if (payload == "") return ctx.reply("[❌] No domain(s) specified.")

        let domains = ctx.payload.split(" ")

        let sql = await libsql.batch(domains.map(domain => ({
            sql: "INSERT INTO blacklist (hostname) VALUES (?)",
            args: [domain]
        })))

        ctx.reply("[✅] Added the following domains to the blacklist - " + domains.join(", "))

    })

    client.command("unblock", async (ctx) => {
        console.log(ctx.from)
        const { payload, from } = ctx

        if (!env.telegram.adminUsers.includes(from.username)) {
            ctx.reply("You are not a part of the admin user list")
            return
        }

        if (payload == "") return ctx.reply("[❌] No domain(s) specified.")

        let domains = ctx.payload.split(" ")

        let sql = await libsql.batch(domains.map(domain => ({
            sql: "DELETE FROM blacklist WHERE hostname = ?",
            args: [domain]
        })))

        ctx.reply("[✅] Removed the following domains from the blacklist - " + domains.join(", "))
    })

    client.command("listconnected", async (ctx) => {
        const { from } = ctx
        if (!env.telegram.adminUsers.includes(from.username)) {
            ctx.reply("You are not a part of the admin user list")
            return
        }

        let connectedInstances = await libsql.execute({
            sql: "SELECT hostname FROM instances",
            args: []
        })

        ctx.reply(connectedInstances.rows.map(hostname => `${hostname.hostname}`).join("\n")) 
    })

    client.command("whitelist", async (ctx) => {
        const { from } = ctx
        if (!env.telegram.adminUsers.includes(from.username)) {
            ctx.reply("You are not a part of the admin user list")
            return
        }

        let allowedInstances = await libsql.execute({
            sql: "SELECT hostname FROM whitelist",
            args: []
        })

        ctx.reply(allowedInstances.rows.map(hostname => `${hostname.hostname}`).join("\n")) 
    })

    client.command("blacklist", async (ctx) => {
        const { from } = ctx
        if (!env.telegram.adminUsers.includes(from.username)) {
            ctx.reply("You are not a part of the admin user list")
            return
        }

        let blockedInstances = await libsql.execute({
            sql: "SELECT hostname FROM blacklist",
            args: []
        })

        ctx.reply(blockedInstances.rows.map(hostname => `${hostname.hostname}`).join("\n")) 
    })

    client.launch()

    console.log("[TELEGRAM] Started bot.")

    return client
}
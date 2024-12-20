import { createClient } from "@libsql/client"
import Database from "bun:sqlite"

export const initDB = async () => {
    const db = new Database("db/sqlite.db", { strict: true, create: true })

    await db.run(`CREATE TABLE IF NOT EXISTS "instances" ("id" integer,"hostname" text NOT NULL,"added_at" datetime NOT NULL,"inboxpath" text NOT NULL, PRIMARY KEY (id))`)
    await db.run(`CREATE TABLE IF NOT EXISTS "whitelist" ("id" integer,"hostname" text NOT NULL, PRIMARY KEY (id))`)
    await db.run(`CREATE TABLE IF NOT EXISTS "blacklist" ("id" integer,"hostname" text NOT NULL, PRIMARY KEY (id))`)
    await db.run(`CREATE TABLE IF NOT EXISTS "relays" ("id" integer,"hostname" text NOT NULL,"activity" text NOT NULL, "inboxurl" TEXT NOT NULL, PRIMARY KEY (id))`)

    return db
}
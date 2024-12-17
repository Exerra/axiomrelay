import { createClient } from "@libsql/client"

export const initDB = async () => {
    const libsql = createClient({
        url: "file:libsql.db"
    })
    
    await libsql.execute({
        sql: `CREATE TABLE IF NOT EXISTS "instances" ("id" integer,"hostname" text NOT NULL,"added_at" datetime NOT NULL,"inboxpath" text NOT NULL, PRIMARY KEY (id))`,
        args: []
    })
    
    await libsql.execute({
        sql: `CREATE TABLE IF NOT EXISTS "whitelist" ("id" integer,"hostname" text NOT NULL, PRIMARY KEY (id))`,
        args: []
    })
    
    await libsql.execute({
        sql: `CREATE TABLE IF NOT EXISTS "blacklist" ("id" integer,"hostname" text NOT NULL, PRIMARY KEY (id))`,
        args: []
    })

    return libsql
}
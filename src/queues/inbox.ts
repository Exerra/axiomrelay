import type { Job as BQJob } from "bee-queue"
import { InboxQueue } from "../util/queues"
import { createHash, createSign } from "node:crypto"
import env from "../util/env"
import { generateDigestHeader } from "../util/signer"
import { signHeaders } from "../util/signatures"
import { db, packageJson } from ".."

export type Job = BQJob<{ url: string, activity: any }>

export const scheduler = async (inboxURL: string, body: any) => {
    let jobs: Job[] = []

    jobs.push(InboxQueue.createJob({
        url: inboxURL,
        activity: body
    }))

    // jobs[0].retries(5)

    jobs[0].on('retrying', (err: any) => {
        console.log(
          `Job ${jobs[0].id} failed with error ${err.message} but is being retried!`
        );
    });

    await InboxQueue.saveAll(jobs)
}

export const processor = async (job: Job) => {
    const { url, activity } = job.data
    
    const base = `https://${env.hostname}`
    const hostname = new URL(url).hostname

    if (env.debug) console.log(url)

    let headersForSignage = {
        "Content-Type": `application/activity+json`,
        digest: generateDigestHeader(JSON.stringify(activity)),
        host: hostname,
        date: new Date().toUTCString(),
        signature: "",
        "User-Agent": "AxiomRelay/" + packageJson.version
    }

    let headersToSign = ["host", "date", "digest"]

    let signedHeaders = await signHeaders(`post ${new URL(url).pathname}`, headersForSignage, headersToSign)

    if (env.debug) console.log(headersForSignage, headersToSign, signedHeaders)
    if (env.debug) console.log(activity)

    let req = await fetch(url, {
        method: "POST",
        headers: signedHeaders,
        body: JSON.stringify(activity),
    })

    if (req.status >= 300) {
        console.log(req.status, req.statusText)

        console.log(activity, url)

        console.log(await req.text(), " req text")
        throw new Error("Not 200")
    }

    const res = await req.text()

    if (env.debug) console.log(req.status, req.statusText, res)

    try {
        // If subscription to relay is accepted
        if (activity.type == "Accept" && activity.object.type == "Follow") {
            let query = "INSERT INTO instances (hostname, added_at, inboxpath) VALUES (?, ?, ?)"

            await db.run(query, [ new URL(url).hostname, new Date().toISOString(), "inbox" ])
        }

        // If unsubscribe from relay is accepted (it should always be, but still)
        if (activity.type == "Accept" && activity.object.type == "Undo" && activity.object.object.type == "Follow") {
            let query = "DELETE FROM instances WHERE hostname = ?"

            await db.run(query, [ new URL(url).hostname ])
        }
    } catch (e) {
        console.log(e)
    }

    return 200
}
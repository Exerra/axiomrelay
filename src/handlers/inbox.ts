import type { Job as BQJob } from "bee-queue"
import { InboxQueue } from "../util/queues"
import { createHash, createSign } from "node:crypto"
import env from "../util/env"
import { generateDigestHeader } from "../util/signer"
import { signHeaders } from "../util/signatures"

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

    let headersForSignage = {
        "Content-Type": `application/activity+json`,
        digest: generateDigestHeader(JSON.stringify(activity)),
        host: hostname,
        date: new Date().toUTCString(),
        signature: ""
    }

    let headersToSign = ["host", "date", "digest"]

    let req = await fetch(url, {
        method: "POST",
        headers: await signHeaders(`post ${new URL(url).pathname}`, headersForSignage, headersToSign),
        body: JSON.stringify(activity),
    })

    console.log(req.status)

    if (req.status >= 300) {
        console.log(req.status, req.statusText)

        console.log(activity, url)

        console.log(await req.text(), " req text")
        throw new Error("Not 200")
    }

    const res = await req.text()

    // console.log(res, req.status, req.statusText)
    console.log(res)

    return 200
}
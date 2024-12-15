import type { Job as BQJob } from "bee-queue"
import { InboxQueue } from "../util/queues"
import { createHash, createSign } from "node:crypto"

export type Job = BQJob<{ url: string, activity: any }>

function generateDigestHeader(body: string): string {
    const hash = createHash('sha256').update(body).digest('base64');
    return `SHA-256=${hash}`;
}

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
    
    const base = `https://${process.env.HOSTNAME}`

    const date = new Date().toUTCString()
    const hostname = new URL(url).hostname

    console.log(url)


    let headersForSignage = {
        "Content-Type": `application/activity+json`,
        digest: "SHA-256=" + createHash("sha256").update(JSON.stringify(activity)).digest("base64"),
        host: hostname,
        date: new Date().toUTCString(),
        signature: ""
    }

    let toSign = `(request-target): post ${new URL(url).pathname}
host: ${headersForSignage.host}
date: ${headersForSignage.date}
digest: ${headersForSignage.digest}`
    
    const sign = createSign("RSA-SHA256")
    
    sign.update(toSign)

    const signature = sign.sign({ key: process.env.PRIVATE_KEY! }, "base64")

    const header = `keyId="${base}/actor#main-key",headers="(request-target) host date digest",algorithm="rsa-sha256",signature="${signature}"`
    
    headersForSignage.signature = header

    let req = await fetch(url, {
        method: "POST",
        headers: headersForSignage,
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
    console.log(req)

    return 200
}
import cors from "@elysiajs/cors";
import { Elysia } from "elysia";
import { scheduler as inboxScheduler, processor as inboxProcessor, type Job as InboxJob } from "./queues/inbox";
import { InboxQueue } from "./util/queues";
import env from "./util/env";
import { generateDigestHeader } from "./util/signer";
import { getModules } from "./util/modules";
import { info } from "./routes/info";
import { initDB } from "./util/initDB";
import { webpages } from "./routes/webpages";
import { initTelegram } from "./util/telegram";
import { generateKeys } from "./util/generateKeys";
import { signHeaders, verifySignature } from "./util/signatures";
import { randomUUID } from "node:crypto";
import { getPackageJson } from "./util/package";

await generateKeys()

export const db = await initDB()

const { active: modules, total } = await getModules()

const telegram = await initTelegram()
export const packageJson = await getPackageJson()

console.log(`[MODULES] Loaded ${modules.length} modules out of ${total} in total.`)

const app = new Elysia()

// Needs to be before routes
app.onError(({ code, error }) => {
	console.log(code, error)
	return new Response(error.toString())
})

app.use(info)
app.use(webpages)
app.use(cors())

app.onParse(({ request, contentType }) => {
	console.log(contentType)
	if (contentType == "application/activity+json") return request.json()
	if (contentType.startsWith("application/ld+json")) return request.json()

	return request.text()
})

app.all("*", ({ request }) => {
	console.log("WILDCARD", request.url)

	return 200
})

app.get("/actor", async ({ request, body, set, headers }) => {
	console.log("actor being fetched")
	const url = new URL(request.url)
	url.protocol = "https"
	
	const base = `https://${env.hostname}`

	set.headers["content-type"] = "application/activity+json"

	let temp = {
		publicKey: {
			id: base + "/actor#main-key",
			owner: base + `/actor`,
			publicKeyPem: env.publicKey
		},
		inbox: base + `/inbox`,
		// outbox: base + `/outbox`,
		// following: base + `/following`,
		// followers: base + `/followers`,
		preferredUsername: "relay",
		endpoints: {
			sharedInbox: base + `/inbox`
		},
		summary: "AxiomRelay bot",
		url: base + `/actor`,
		"@context": [
			"https://www.w3.org/ns/activitystreams",
        	"https://w3id.org/security/v1"
		],
		id: base + `/actor`,
		type: "Application",
		name: "AxiomRelay"
	}

	// temp.signature = await generateLDSignature(temp, "daedric.world", new Date().toUTCString())

	return temp
})

app.post("/inbox", async (ctx) => {
	const { request, headers, set } = ctx
	const body = ctx.body as any
	const base = `https://${env.hostname}`

	let obj = body.object.object || body.object || base + "/inbox"
	let incomingInstanceHostname = new URL(body.id).hostname

	// console.log(headers)
	// console.log(JSON.stringify(body, null, 4))
	try {
		if (headers["host"] != env.hostname) {
			// set.status = 401
			return 401
		}

		if (!headers["signature"]) {
			// set.status = 401
			return 401
		}

		if (!headers["digest"]) {
			// set.status = 401
			return 401
		}

		let split = headers["signature"].split(",")
		let keyId = ""
		let signature = ""

		// better to let this run in a seperate loop to insure that if keyId is after headers it still saves the keyId
		// also yes, this system could be made more efficient, I don't want to try though
		for (let section of split) {
			if (!section.startsWith("keyId")) continue

			keyId = section.split("=")[1].replaceAll("\"", "")
		}

		// same for this
		for (let section of split) {
			if (!section.startsWith("signature")) continue

			signature = section.slice(11, -1).trim()
		}

		for (let section of split) {
			if (!section.startsWith("headers")) continue
			let headersArr = section.split("=")[1].replaceAll("\"", "").split(" ")

			if (headersArr[0] != "(request-target)") {
				// set.status = 401
				return 401
			}

			if (!headersArr.includes("digest")) {
				// set.status = 401
				return 401
			}

			headersArr.splice(0, 1) // removes (request-target)

			const digest = generateDigestHeader(JSON.stringify(body))
			
			if (headers["digest"] != digest) {
				// set.status = 401
				return 401
			}

			let headersToCheckAgainst: any = {}

			for (let header of headersArr) {
				headersToCheckAgainst[header] = headers[header]
			}

			let actor = new URL(body.actor)

			const actorReq = await fetch(actor.toString(), {
				method: "GET",
				headers: await signHeaders("get " + actor.pathname, { accept: `application/activity+json, application/ld+json; profile="https://www.w3.org/ns/activitystreams"`, host: actor.hostname, date: new Date().toUTCString(), "User-Agent": "AxiomRelay/" + packageJson.version })
			})

			let actorRes = await actorReq.json()

			let { publicKey } = actorRes

			if (publicKey.id != keyId) {
				// set.status = 401
				return 401
			}

			let verified = await verifySignature("post /inbox", headersToCheckAgainst, publicKey.publicKeyPem, signature, headersArr)

			if (!verified) {
				return 401
			}
		}
	} catch (e) {
		console.log(e)

		// Better to reject
		// set.status = 401
		return 401
	}

	let checkableStrings: string[] = []

	if (body.type != "Follow") {
		if ("object" in body && body.object.type != "Follow") {
			if (typeof body.object != "string") checkableStrings.push(body.object.content)

			for (let module of modules) {
				let { reject } = await module.run({
					checkableStrings: checkableStrings,
					rawActivity: body
				})
		
				if (reject) {
					// set.status = 401
					console.log("Rejecting: " + body.id)
					return 200
				}
			}
		}
	}

	if (body.type == "Accept") {
		return 200
	}

	if (body.type == "Follow") {
		let reject = false

		let blacklistQuery = db.query("SELECT count(id) FROM blacklist WHERE hostname = ?;")
		let blacklist = await blacklistQuery.get(incomingInstanceHostname) as { "count(id)": number }

		if (blacklist["count(id)"] > 0) reject = true

		if (env.allowlistOnly) {
			let whitelistQuery = db.query("SELECT count(id) FROM whitelist WHERE hostname = ?;")
			let whitelist = await whitelistQuery.get(incomingInstanceHostname) as { "count(id)": number }

			// Blacklist is more important
			if (blacklist["count(id)"] as number > 0) reject = true
			else if (whitelist["count(id)"] == 0) reject = true
			else reject = false
		}

		let { actor } = body
		let actorURL = new URL(actor)

		const actorReq = await fetch(actor, {
			method: "GET",
			headers: await signHeaders("get " + actorURL.pathname, { host: actorURL.hostname, date: new Date().toUTCString(), Accept: "application/ld+json", "User-Agent": "AxiomRelay/" + packageJson.version })
		})

		const actorRes = await actorReq.json()

		let remoteInbox = actorRes.sharedInbox || actorRes.endpoints.sharedInbox || actorRes.inbox || `https://${incomingInstanceHostname}/inbox`

		let reqBody = {
			"@context": ["https://www.w3.org/ns/activitystreams", "https://w3id.org/security/v1"],
			id: base + `/inbox/followresponse/${randomUUID()}`,
			type: reject ? "Reject" : "Accept",
			object: body,
			actor: base + "/actor"
		}

		setTimeout(async () => {
			await inboxScheduler(remoteInbox, reqBody)
		}, 3000)
	}

	else if (body.type == "Create") {
		let id = obj.id

		let query = db.query("SELECT hostname, inboxpath from instances WHERE hostname != ?;")
		let connectedInstances = await query.all(new URL(id).hostname) as { hostname: string, inboxpath: string }[]

		let reqBody = {
			"@context": ["https://www.w3.org/ns/activitystreams", "https://w3id.org/security/v1"],
			id: base + `/inbox/announce/${randomUUID()}`,
			type: "Announce",
			object: body.object,
			actor: base + "/actor",
		}


		for (let row of connectedInstances) {
			const { hostname, inboxpath } = row

			await inboxScheduler(`https://${hostname}/${inboxpath}`, reqBody)
		}
	}

	else if (body.type == "Undo" && "object" in body && body.object.type == "Follow") {
		let actor = body.actor

		let hostname = new URL(actor).hostname

		let instanceCountQuery = db.query("SELECT count(id) FROM instances WHERE hostname = ?;")
		let instanceCount = await instanceCountQuery.get(hostname) as { "count(id)": number }

		let count = instanceCount["count(id)"]

		if (count == 0) return

		let inboxQuery = db.query("SELECT inboxpath from instances WHERE hostname = ?;")
		let { inboxpath } = await inboxQuery.get(hostname) as { inboxpath: string }
		

		let reqBody = {
			"@context": ["https://www.w3.org/ns/activitystreams", "https://w3id.org/security/v1"],
			id: base + `/inbox/undo/${randomUUID()}`, // TODO: actual ids
			type: "Accept",
			object: body,
			actor: base + "/actor",
		}

		await inboxScheduler(`https://${hostname}/${inboxpath}`, reqBody)
	}

	else if (body.type == "Announce") {
		let id = obj.id
		let actor = body.actor

		let query = db.query("SELECT hostname, inboxpath from instances WHERE hostname != ?;")
		let connectedInstances = await query.all(new URL(actor).hostname) as { hostname: string, inboxpath: string }[]

		let reqBody = {
			"@context": ["https://www.w3.org/ns/activitystreams", "https://w3id.org/security/v1"],
			id: base + `/inbox/announce/${randomUUID()}`,
			type: "Announce",
			object: body.object,
			actor: base + "/actor",
		}


		for (let row of connectedInstances) {
			const { hostname, inboxpath } = row

			await inboxScheduler(`https://${hostname}/${inboxpath}`, reqBody)
		}
	}

	else {
		let id = obj.id
		let actor = body.actor

		let query = db.query("SELECT hostname, inboxpath from instances WHERE hostname != ?;")
		let connectedInstances = await query.all(new URL(actor).hostname) as { hostname: string, inboxpath: string }[]

		for (let row of connectedInstances) {
			const { hostname, inboxpath } = row

			await inboxScheduler(`https://${hostname}/${inboxpath}`, body)
		}
	}


	set.headers["content-type"] = `application/ld+json; profile="https://www.w3.org/ns/activitystreams"`

	return 200
})

InboxQueue.process(env.jobs.concurrency, async (job: InboxJob) => {
	return await inboxProcessor(job)
})

app.listen(8079);

console.log(
	`📮 Relay is running at ${app.server?.hostname}:${app.server?.port}`
);
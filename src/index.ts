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
import { signHeaders } from "./util/signatures";

await generateKeys()

export const libsql = await initDB()

const { active: modules, total } = await getModules()

const telegram = await initTelegram()

// console.log(`Loaded ${modules.length} modules.`)
console.log(`[MODULES] Loaded ${modules.length} modules out of ${total} in total.`)

const app = new Elysia()

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
		summary: "Oblivion Gate bot",
		url: base + `/actor`,
		"@context": [
			"https://www.w3.org/ns/activitystreams",
        	"https://w3id.org/security/v1"
		],
		id: base + `/actor`,
		type: "Application",
		name: "Oblivion Gate"
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

	// console.log("INBOX", obj)

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

			// let headersToCheckAgainst: any = {}

			// for (let header of headersArr) {
			// 	headersToCheckAgainst[header] = headers[header]
			// }

			// let generatedSignedHeaders = await signHeaders("post /inbox", headersToCheckAgainst, headersArr)

			// let actorHostname = new URL(body.actor).hostname

			// try {
			// 	const actorReq = await fetch(body.actor, {
			// 		method: "GET",
			// 		headers: await signHeaders("get " + new URL(body.actor).pathname, { accept: `application/activity+json, application/ld+json; profile="https://www.w3.org/ns/activitystreams"`, host: actorHostname, date: new Date().toUTCString() })
			// 	})
		
			// 	console.log(actorReq.status, actorReq.statusText, actorReq.headers)
			// 	console.log(await actorReq.json())
			// } catch (e) {
			// 	console.log(e)
			// }

			// console.log(headers["signature"], generatedSignedHeaders.signature, "SIGNATURE")
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
					return 401
				}
			}
		}
	}

	if (body.type == "Accept") {
		return 200
	}

	if (body.type == "Follow") {
		let reject = false

		let blacklist = await libsql.execute({
			sql: `SELECT count(id) FROM blacklist WHERE hostname = ?;`,
			args: [incomingInstanceHostname]
		})

		// @ts-ignore :)
		if (blacklist.rows[0]["count(id)"] > 0) reject = true

		if (env.allowlistOnly) {
			let whitelist = await libsql.execute({
				sql: `SELECT count(id) FROM whitelist WHERE hostname = ?;`,
				args: [incomingInstanceHostname]
			})

			// Blacklist is more important
			if (blacklist.rows[0]["count(id)"] as number > 0) reject = true
			else if (whitelist.rows[0]["count(id)"] == 0) reject = true
			else reject = false
		}

		let { actor } = body
		let actorURL = new URL(actor)

		const actorReq = await fetch(actor, {
			method: "GET",
			headers: await signHeaders("get " + actorURL.pathname, { host: actorURL.hostname, date: new Date().toUTCString(), Accept: "application/ld+json" })
		})

		const actorRes = await actorReq.json()

		let remoteInbox = actorRes.sharedInbox || actorRes.endpoints.sharedInbox || actorRes.inbox || `https://${incomingInstanceHostname}/inbox`

		let reqBody = {
			"@context": ["https://www.w3.org/ns/activitystreams", "https://w3id.org/security/v1"],
			id: base + "/inbox" + "/followresponse" + Math.random().toString(),
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

		let { rows } = await libsql.execute({
			sql: "SELECT hostname, inboxpath from instances WHERE hostname != ?",
			args: [new URL(id).hostname]
		})

		let reqBody = {
			"@context": ["https://www.w3.org/ns/activitystreams", "https://w3id.org/security/v1"],
			id: base + "/inbox" + "/announce" + Math.random().toString(),
			type: "Announce",
			object: body.object,
			actor: base + "/actor",
			// to: [ "https://www.w3.org/ns/activitystreams#Public" ]
		}

		const digest = generateDigestHeader(JSON.stringify(reqBody))

		// reqBody.signature = await generateLDSignature(reqBody, hostname, date)

		for (let row of rows) {
			const { hostname, inboxpath } = row

			await inboxScheduler(`https://${hostname}/${inboxpath}`, reqBody)
		}
	}

	else if (body.type == "Undo" && "object" in body && body.object.type == "Follow") {
		let actor = body.actor

		let hostname = new URL(actor).hostname

		let sql = await libsql.execute({
			sql: "SELECT count(id) FROM instances WHERE hostname = ?",
			args: [hostname]
		})

		let count = sql.rows[0]["count(id)"]

		if (count == 0) return

		let { rows } = await libsql.execute({
			sql: "SELECT inboxpath from instances WHERE hostname == ?",
			args: [hostname]
		})

		let reqBody = {
			"@context": ["https://www.w3.org/ns/activitystreams", "https://w3id.org/security/v1"],
			id: base + "/inbox" + "/undo" + Math.random().toString(), // TODO: actual ids
			type: "Accept",
			object: body,
			actor: base + "/actor",
			// to: [ "https://www.w3.org/ns/activitystreams#Public" ]
		}

		await inboxScheduler(`https://${hostname}/${rows[0].inboxpath}`, reqBody)
	}

	else if (body.type == "Announce") {
		let id = obj.id
		let actor = body.actor

		let { rows } = await libsql.execute({
			sql: "SELECT hostname, inboxpath from instances WHERE hostname != ?",
			args: [new URL(actor).hostname]
		})

		let reqBody = {
			"@context": ["https://www.w3.org/ns/activitystreams", "https://w3id.org/security/v1"],
			id: base + "/inbox" + "/announce" + Math.random().toString(),
			type: "Announce",
			object: body.object,
			actor: base + "/actor",
			// to: [ "https://www.w3.org/ns/activitystreams#Public" ]
		}

		// const digest = generateDigestHeader(JSON.stringify(body))

		// reqBody.signature = await generateLDSignature(reqBody, hostname, date)

		for (let row of rows) {
			const { hostname, inboxpath } = row

			await inboxScheduler(`https://${hostname}/${inboxpath}`, reqBody)
		}
	}

	else {
		let id = obj.id
		let actor = body.actor

		let { rows } = await libsql.execute({
			sql: "SELECT hostname, inboxpath from instances WHERE hostname != ?",
			args: [new URL(actor).hostname]
		})

		// let reqBody = {
		// 	"@context": ["https://www.w3.org/ns/activitystreams", "https://w3id.org/security/v1"],
		// 	id: base + "/inbox" + "/announce" + Math.random().toString(),
		// 	type: "Announce",
		// 	object: body.object,
		// 	actor: base + "/actor",
		// 	// to: [ "https://www.w3.org/ns/activitystreams#Public" ]
		// }

		// const digest = generateDigestHeader(JSON.stringify(body))

		// reqBody.signature = await generateLDSignature(reqBody, hostname, date)

		for (let row of rows) {
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
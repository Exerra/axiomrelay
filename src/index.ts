import cors from "@elysiajs/cors";
import { Elysia } from "elysia";
import { scheduler as inboxScheduler, processor as inboxProcessor, type Job as InboxJob } from "./handlers/inbox";
import { InboxQueue } from "./util/queues";

const app = new Elysia()

app.use(cors())

app.onParse(({ request, contentType }) => {
	console.log(contentType)
	if (contentType == "application/activity+json") return request.json()

	return request.text()
})

app.get("/", () => "Hello Elysia")

app.all("*", ({ request }) => {
	console.log("WILDCARD", request.url)

	return 200
})

app.get("/.well-known/webfinger", ({ query, request, set }) => {
	const { resource } = query

	const url = new URL(request.url)

	url.protocol = "https"
	
	// const base = `${url.protocol}//${url.hostname}${url.port ? ":" + url.port : ""}`

	const base = `https://${process.env.HOSTNAME}`

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

app.get("/actor", async ({ request, body, set, headers }) => {
	const url = new URL(request.url)

	url.protocol = "https"
	
	// const base = `${url.protocol}//${url.hostname}${url.port ? ":" + url.port : ""}`
	const base = `https://${process.env.HOSTNAME}`

	set.headers["content-type"] = "application/activity+json"

	let temp = {
		publicKey: {
			id: base + "/actor#main-key",
			owner: base + `/actor`,
			publicKeyPem: process.env.PUBLIC_KEY
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

app.post("/inbox", async ({ request, body, headers, set }) => {
	const base = `https://${process.env.HOSTNAME}`

	let obj = body.object.object || body.object || base + "/inbox"

	console.log("INBOX", obj)

	console.log(headers)

	console.log(JSON.stringify(body, null, 4))

	if (body.type != "Follow") return 400

	let reqBody = {
		"@context": ["https://www.w3.org/ns/activitystreams", "https://w3id.org/security/v1"],
		id: base + "/inbox" + "/accept" + Math.random().toString(),
		type: "Accept",
		object: body,
		actor: base + "/actor"
	}

	let remoteInbox = `https://${new URL(body.id).hostname}/inbox`

	setTimeout(async () => {
		await inboxScheduler(remoteInbox, reqBody)
	}, 3000)


	set.headers["content-type"] = `application/ld+json; profile="https://www.w3.org/ns/activitystreams"`

	return 200
})

InboxQueue.process(1, async (job: InboxJob) => {
	return await inboxProcessor(job)
})

app.listen(8079);

console.log(
	`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);


// const url = "https://daedric.world/users/9wc2s12x68ge001r"

// const headersForSignage = {
// 	accept: `application/activity+json, application/ld+json; profile="https://www.w3.org/ns/activitystreams"`,
// 	// "Content-Type": `application/ld+json`,
// 	host: new URL(url).hostname,
// 	date: new Date().toUTCString(),
// 	"User-Agent": "Relay/0.0.1"
// }

// const date = new Date().toUTCString()

// let toSign = `(request-target): get /users/9wc2s12x68ge001r
// host: ${headersForSignage.host}
// date: ${headersForSignage.date}`

// const sign = createSign("RSA-SHA256")
// sign.update(toSign)
// const signature = sign.sign({ key: process.env.PRIVATE_KEY! }, "base64")
// const header = `keyId="https://<redacted>/actor#main-key",headers="(request-target) host date",algorithm="rsa-sha256",signature="${signature}"`

// headersForSignage.signature = header

// // headersForSignage

// const req = await fetch("https://daedric.world/users/9wc2s12x68ge001r", {
// 	headers: headersForSignage, //await signRequest("https://daedric.world/users/9wc2s12x68ge001r", "POST", "", headersForSignage)
// })

// console.log(req.status, req.statusText, await req.json())
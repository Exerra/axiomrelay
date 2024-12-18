import { createHash, createSign } from "node:crypto"
import { canonize } from "jsonld";
import env from "./env";

export const generateLDSignature = async (activity: any, hostname: string, date: string) => {
    const base = `https://${env.hostname}`

    const canonicalised = await canonize(activity, {
        algorithm: "URDNA2015",
        format: "application/n-quads"
    })

    const sha256 = createHash('sha256');
    const digest = sha256.update(canonicalised).digest('base64')

    let signingString = `(request-target): post /inbox
host: ${hostname}
date: ${date}
digest: ${digest}`

    const signer = createSign("RSA-SHA256")
    signer.update(signingString)
    const signature = signer.sign({ key: env.privateKey! }, "base64")
    const ldSignature = {
        type: "RsaSignature2017",
        created: date,
        signatureValue: signature,
        creator: base + "/actor#main-key",
        proofPurpose: "assertionMethod"
    }

    return ldSignature
}

export const signHeaders = async (requestTarget: string, headers: any, headersToSign: string[] = ["host", "date"]) => {
    const base = `https://${env.hostname}`

    let signArr = ["(request-target): " + requestTarget]

    for (let header of headersToSign) {
        signArr.push(`${header}: ${headers[header]}`)
    }
    
    let toSign = signArr.join("\n")
        
    const sign = createSign("RSA-SHA256")
    
    sign.update(toSign)

    const signature = sign.sign({ key: env.privateKey! }, "base64")

    const signatureHeader = `keyId="${base}/actor#main-key",headers="${["(request-target)", ...headersToSign].join(" ")}",algorithm="rsa-sha256",signature="${signature}"`

    headers.signature = signatureHeader

    return headers
}

export const validateHTTPSignature = async (actor: string, headers: any) => {
    // let headersToCheckAgainst: any = {}

    // for (let header of headersArr) {
    //     headersToCheckAgainst[header] = headers[header]
    // }

    // let generatedSignedHeaders = await signHeaders("post /inbox", headersToCheckAgainst, headersArr)

    // let actorHostname = new URL(body.actor).hostname

    // try {
    //     const actorReq = await fetch(body.actor, {
    //         method: "GET",
    //         headers: await signHeaders("get " + new URL(body.actor).pathname, { accept: `application/activity+json, application/ld+json; profile="https://www.w3.org/ns/activitystreams"`, host: actorHostname, date: new Date().toUTCString() })
    //     })

    //     console.log(actorReq.status, actorReq.statusText, actorReq.headers)
    //     console.log(await actorReq.json())
    // } catch (e) {
    //     console.log(e)
    // }

    // console.log(headers["signature"], generatedSignedHeaders.signature, "SIGNATURE")
}
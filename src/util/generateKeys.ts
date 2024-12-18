import { generateKeyPairSync } from "node:crypto"
import env from "./env"

export const generateKeys = async () => {
    console.log("Checking if encryption keys are present")
    let publicKeyFile = Bun.file("public.pem")
    let privateKeyFile = Bun.file("private.pem")
    // if (await Bun.file("").exists())

    if (!await publicKeyFile.exists() || !await privateKeyFile.exists()) {
        console.log("Keys not present, generating an RSA keypair now.")
        const { publicKey, privateKey } = generateKeyPairSync("rsa", {
            modulusLength: 4097,
        })

        env.publicKey = publicKey.export().toString()
        env.privateKey = privateKey.export().toString()

        await Bun.write("public.pem", env.publicKey)
        await Bun.write("private.pem", env.privateKey)

        console.log("Keys have been saved in PEM format to disk and loaded in env variables")

        return 200
    }

    env.publicKey = await publicKeyFile.text()
    env.privateKey = await privateKeyFile.text()

    console.log("Keys have been read from disk and loaded in env variables")

    return 200
}
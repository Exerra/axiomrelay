import { env } from "bun";

export default {
    hostname: env.HOSTNAME,
    privateKey: env.PRIVATE_KEY,
    publicKey: env.PUBLIC_KEY
}
import { env } from "bun";

export default {
    hostname: env.HOSTNAME,
    privateKey: env.PRIVATE_KEY,
    publicKey: env.PUBLIC_KEY,
    allowlistOnly: env.ALLOWLIST_ONLY == "true",
    adminUsername: env.ADMIN_USERNAME,
    adminURL: env.ADMIN_URL
}
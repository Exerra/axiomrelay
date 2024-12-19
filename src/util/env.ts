import { env } from "bun";

export default {
    hostname: env.HOSTNAME,
    privateKey: "env.PRIVATE_KEY",
    publicKey: "env.PUBLIC_KEY",
    allowlistOnly: env.ALLOWLIST_ONLY == "true",
    adminUsername: env.ADMIN_USERNAME,
    adminURL: env.ADMIN_URL,
    telegram: {
        enabled: env.TELEGRAM_ENABLED == "true",
        adminUsers: JSON.parse(env.TELEGRAM_ADMINUSERS_ARRAY || "[]"),
        apiKey: env.TELEGRAM_APIKEY
    },
    redis: {
        host: env.REDIS_HOST || "redis",
        port: parseInt(env.REDIS_PORT || "6379")
    },
    jobs: {
        concurrency: parseInt(env.JOB_CONCURRENCY || "1")
    }
}
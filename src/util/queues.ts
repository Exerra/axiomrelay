import BeeQueue from "bee-queue";
import env from "./env";

export const InboxQueue = new BeeQueue("inbox", {
    redis: {
        host: env.redis.host,
        port: env.redis.port
    }
})
import BeeQueue from "bee-queue";

export const InboxQueue = new BeeQueue("inbox", {
    redis: {
        host: "redis",
        port: 6379
    }
})
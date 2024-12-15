import BeeQueue from "bee-queue";

export const InboxQueue = new BeeQueue("inbox", {
    redis: {
        host: "localhost",
        port: 6379
    }
})
import BeeQueue from "bee-queue";

export const InboxQueue = new BeeQueue("inbox", {
    redis: {
        // url: "rediss://default:AVIKAAIjcDE0ZjlhMDFkMWFmMWI0ZjEzODkwMmMxYjU5OTAxNzUzMnAxMA@true-swan-21002.upstash.io:6379"
        host: "localhost",
        port: 6379
    }
})
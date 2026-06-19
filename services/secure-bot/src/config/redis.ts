import type { ConnectionOptions } from "bullmq";

export const redisConnectionOptions: ConnectionOptions = {
    url: process.env.REDIS_URL!,
    maxRetriesPerRequest: null
}
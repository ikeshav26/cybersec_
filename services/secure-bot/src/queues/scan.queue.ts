import { Queue } from "bullmq";
import { redisConnectionOptions } from "../config/redis.js";

export const scanQueue = new Queue("scan-queue", {
    connection: redisConnectionOptions,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: "exponential",
            delay: 5000,
        },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 500 },
    }
});
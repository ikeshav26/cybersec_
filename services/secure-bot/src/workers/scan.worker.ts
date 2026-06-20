import { Worker } from "bullmq";
import { runBackgroundScan } from "../utils/background-scanner.js";
import { redisConnectionOptions } from "../config/redis.js";


export const worker = new Worker("scan-queue", async (job) => {
    console.log("received by worker")
    const { scanId, repoId, repoUrl, installationId } = job.data;
    await runBackgroundScan(scanId, repoUrl, installationId);
    console.log("finished by worker")
}, {
    connection: redisConnectionOptions,
    concurrency: 3
})

worker.on("failed", (job, err) => {
    console.error(`Job ${job?.id} failed with error: ${err.message}`);
});


const shutdown = async (signal: string) => {
    console.log(`Received ${signal}. Shutting down worker gracefully...`);
    await worker.close();
    process.exit(0);
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
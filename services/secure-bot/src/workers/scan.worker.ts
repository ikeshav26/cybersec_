import { Worker } from "bullmq";
import { runBackgroundScan } from "../utils/background-scanner.js";
import { redis } from "../config/redis.js";


new Worker("scan-queue", async job => {
    console.log("received by worker")
    const { scanId, repoId, repoUrl, installationId } = job.data;
    await runBackgroundScan(scanId, repoUrl, installationId);
    console.log("finished by worker")
}, {
    connection: redis as any,
    concurrency: 4
})
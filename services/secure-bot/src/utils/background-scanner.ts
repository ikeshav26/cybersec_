import path from "path"
import { prisma } from "../config/db.js"
import { cloneRepo } from "./clone-repo.js"
import { getFindingByGitleaks } from "./scans/gitleaks.scans.js"
import fs from "fs"
import { getFindingsBySemgrep } from "./scans/semgrep.scan.js"

export async function runBackgroundScan(scanId: string, repoUrl: string, installationId: string) {
    console.log(`Starting scan for scanId:${scanId}:`)
    const clonePath = path.join(process.cwd(), 'scans', scanId)
    try {
        console.log(`Updating scan status to IN_PROGRESS for scanId:${scanId}:`)
        await prisma.scan.update({
            where: {
                id: scanId
            },
            data: {
                status: "IN_PROGRESS",
                startedAt: new Date()
            }
        })

        console.log(`Cloning repository for scanId:${scanId}:`)
        await cloneRepo(repoUrl, clonePath)

        console.log(`Running gitleaks for scanId:${scanId}:`)
        const gitleaksFindings = await getFindingByGitleaks(scanId, clonePath)

        console.log(`Creating findings for scanId:${scanId}:`)
        if (gitleaksFindings.length > 0) {
            await prisma.finding.createMany({
                data: gitleaksFindings
            })
        }

        console.log(`Running semgrep for scanId:${scanId}:`)
        const semgrepFindings = await getFindingsBySemgrep(scanId, clonePath)

        console.log(`Creating findings for scanId:${scanId}:`)
        if (semgrepFindings.length > 0) {
            await prisma.finding.createMany({
                data: semgrepFindings
            })
        }

        console.log(`Updating scan status to SUCCESS for scanId:${scanId}:`)
        await prisma.scan.update({
            where: {
                id: scanId
            },
            data: {
                status: "SUCCESS",
                completedAt: new Date()
            }
        })
    } catch (err: any) {
        console.log(`Error updating scan for scanId:${scanId}:`, err)
        await prisma.scan.update({
            where: {
                id: scanId
            },
            data: {
                status: "FAILED",
                error: err instanceof Error ? err.message : "Internal scanning error",
                completedAt: new Date()
            }
        })
        return err;
    } finally {
        try {
            if (fs.existsSync(clonePath)) {
                await fs.promises.rm(clonePath, { recursive: true, force: true });
                console.log(`Cleaned up temp directory: ${clonePath}`);
            }
        } catch (cleanupErr) {
            console.error("Cleanup failed:", cleanupErr);
        }
    }
}
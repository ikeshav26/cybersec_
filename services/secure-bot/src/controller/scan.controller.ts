import type { Request, Response } from "express";
import { prisma } from "../config/db.js";
import axios from "axios";



export const scanRepo = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ message: "Please provide id" })
        }

        const token = req.cookies.token || req.headers.authorization?.split(" ")[1]

        if (!token) {
            return res.status(401).json({ message: "Unauthorized" })
        }

        //step-1
        const appIntegrationServiceUrl = process.env.APP_INTEGRATION_SERVICE_BASE_URL || "http://localhost:5001"
        const repoResponse = await axios.get(`${appIntegrationServiceUrl}/api/v1/repos/${id}`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        })

        if (repoResponse.status != 200) {
            return res.status(repoResponse.status).json({ message: "Failed to fetch repository" })
        }

        const repo = repoResponse.data.data;

        //step-2
        const scan = await prisma.scan.create({
            data: {
                repositoryId: repo.id,
                status: 'QUEUED',
                branch: 'main'
            }
        })


        //step-3
        setImmediate(() => {
            runBackgroundScan(scan.id, repo.repo_url, repo.installationId).catch((err) => {
                console.log(`Background Scan failed for scanId:${scan.id}`, err);
            })
        })

        return res.status(202).json({
            success: true,
            message: "Scan initiated successfully",
            data: scan
        });
    } catch (err) {
        console.log(err)
        return res.status(500).json({ message: "Internal server error" })
    }
}


export const getScanStatus = async (req: Request, res: Response) => {
    try {
        const { scanId } = req.params;
        if (!scanId) {
            return res.status(400).json({ message: "Please provide scanId" })
        }

        const id = String(scanId)
        const scan = await prisma.scan.findUnique({
            where: {
                id: id
            },
            include: {
                findings: true
            }
        })

        if (!scan) {
            return res.status(404).json({ message: "Scan not found" })
        }

        return res.status(200).json({
            success: true,
            message: "Scan fetched successfully",
            data: scan
        })
    } catch (err) {
        console.log(err)
        return res.status(500).json({ message: "Internal server error" })
    }
}




async function runBackgroundScan(scanId: string, repoUrl: string, installationId: string) {
    console.log(`Starting background scan job ${scanId} for ${repoUrl}...`);
    try {
        // 1. Update status to IN_PROGRESS and set start time
        await prisma.scan.update({
            where: { id: scanId },
            data: {
                status: "IN_PROGRESS",
                startedAt: new Date()
            }
        });

        // 2. Wait for 5 seconds to simulate actual scanning duration
        await new Promise((resolve) => setTimeout(resolve, 5000));

        // 3. Generate mock findings to simulate Semgrep, Trivy, and Gitleaks reports
        const mockFindings = [
            {
                scanId: scanId,
                tool: "GITLEAKS" as const,
                severity: "CRITICAL" as const,
                status: "OPEN" as const,
                title: "AWS Access Key Secret Leak",
                description: "Found hardcoded AWS access key ID: AKIAIOSFODNN7EXAMPLE",
                filePath: "src/config/aws.ts",
                line: 12,
                rawDetails: { ruleId: "aws-access-key", secret: "AKIAIOSFODNN7EXAMPLE" }
            },
            {
                scanId: scanId,
                tool: "SEMGREP" as const,
                severity: "HIGH" as const,
                status: "OPEN" as const,
                title: "SQL Injection Vulnerability",
                description: "User input is directly concatenated into a raw SQL query. Use parameterized queries instead.",
                filePath: "src/controller/user.controller.ts",
                line: 45,
                rawDetails: { ruleId: "javascript.express.security.audit.sql-injection" }
            },
            {
                scanId: scanId,
                tool: "TRIVY" as const,
                severity: "MEDIUM" as const,
                status: "OPEN" as const,
                title: "CVE-2023-45853 in zlib",
                description: "zlib is vulnerable to an integer overflow issue when parsing compressed data.",
                filePath: "package-lock.json",
                line: 120,
                rawDetails: { vulnerabilityId: "CVE-2023-45853", package: "zlib" }
            }
        ];

        // 4. Bulk insert mock findings
        await prisma.finding.createMany({
            data: mockFindings
        });

        // 5. Update scan status to SUCCESS and set complete time
        await prisma.scan.update({
            where: { id: scanId },
            data: {
                status: "SUCCESS",
                completedAt: new Date()
            }
        });

        console.log(`Scan job ${scanId} completed successfully!`);
    } catch (err) {
        console.error(`Error executing scan job ${scanId}:`, err);
        // Mark scan as FAILED in database if anything goes wrong
        await prisma.scan.update({
            where: { id: scanId },
            data: {
                status: "FAILED",
                error: err instanceof Error ? err.message : "Internal scanning error",
                completedAt: new Date()
            }
        }).catch(dbErr => console.error("Failed to write scan error status:", dbErr));
    }
}

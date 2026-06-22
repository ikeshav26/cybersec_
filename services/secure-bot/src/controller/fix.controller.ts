import type { Request, Response } from "express";
import { prisma } from "../config/db.js";
import axios from "axios";
import { cloneRepo } from "../utils/clone-repo.js";
import fs from 'fs'
import { getCodeFix, getMultipleCodeFixes } from "../config/ai.js";
import path from 'path'



export const fixFinding = async (req: Request, res: Response) => {
    try {
        const { findingId } = req.params;
        if (!findingId) {
            return res.status(400).json({ message: "Finding ID is required" })
        }

        const id = String(findingId)
        console.log("Finding id received:", id, " Now finding..Finding for id:", id)

        //step-1 (fetching finding details)
        const finding = await prisma.finding.findUnique({
            where: {
                id: id,
            },
            include: {
                scan: {
                    select: {
                        id: true,
                        repositoryId: true
                    }
                }
            }
        })

        if (!finding) {
            return res.status(404).json({ message: "Finding not found" })
        }

        console.log("Findings received, going to clone repo...")

        //step-2 (cloning-repo)
        const authHeader = req.headers.authorization;
        const cookieHeader = req.headers.cookie;
        const headers: Record<string, string> = {};
        if (authHeader) {
            headers['Authorization'] = authHeader;
        }
        if (cookieHeader) {
            headers['Cookie'] = cookieHeader;
        }

        const repo = await axios.get(
            `${process.env.APP_INTEGRATION_SERVICE_URL}/api/v1/repos/${finding.scan.repositoryId}`,
            { headers }
        )
        const repoUrl = repo.data.data.repo_url;

        const clonePath = path.join(process.cwd(), "fixes", finding.scan.id);
        if (fs.existsSync(clonePath)) {
            await fs.promises.rm(clonePath, { recursive: true, force: true });
        }
        await cloneRepo(repoUrl, clonePath);


        console.log("Cloning complete to path: ", clonePath)

        //step-3 (reading file content)
        console.log("Now reading file content")
        const targetFile = path.join(clonePath, finding.filePath.replace(/^\/?(repo|src)\//, ""));
        const content = await fs.promises.readFile(targetFile, 'utf-8')
        const lines = content.split("\n");

        const lineNum = finding.line ?? 1;
        const start = Math.max(0, lineNum - 15);
        const end = Math.min(
            lines.length,
            lineNum + 15
        );

        const context = lines.slice(start, end).join("\n");

        console.log("Extracting content by reading file done..")

        //step-4 (fixes by gemini)
        console.log("Now fixing code... using gemini")
        const { explanation, fixedCode } = await getCodeFix(finding, content, context)

        if (!explanation || !fixedCode) {
            return res.status(400).json({ message: "Could not generate fix" })
        }

        console.log("Fix generated successfully..")
        //update code
        const fixedFilePath = path.join(clonePath, finding.filePath.replace(/^\/?(repo|src)\//, ""));
        // Backup original file
        await fs.promises.copyFile(fixedFilePath, `${fixedFilePath}.bak`);
        await fs.promises.writeFile(fixedFilePath, fixedCode, "utf-8")

        // Update status in DB
        await prisma.finding.update({
            where: { id: finding.id },
            data: { status: "RESOLVED" }
        })

        return res.status(200).json({ message: "Fix applied successfully", code: fixedCode, explanation: explanation })
    } catch (err) {
        console.log(err)
        return res.status(500).json({ message: "Internal server error" })
    }
}


export const fixAllFindings = async (req: Request, res: Response) => {
    try {
        const { findingIds } = req.body;
        if (!findingIds || !Array.isArray(findingIds) || findingIds.length === 0) {
            return res.status(400).json({ message: "findingIds array is required" })
        }

        // Map findingIds to string array whether they are [{id: "..."}] or ["..."]
        const ids = findingIds.map((item: any) => typeof item === 'object' && item !== null ? String(item.id) : String(item));

        console.log("Retrieving findings for IDs:", ids);
        const findings = await prisma.finding.findMany({
            where: {
                id: { in: ids }
            },
            include: {
                scan: {
                    select: {
                        id: true,
                        repositoryId: true
                    }
                }
            }
        });

        if (findings.length === 0) {
            return res.status(404).json({ message: "No findings found for provided IDs" })
        }

        const firstFinding = findings[0];
        console.log("Findings received, going to clone repo for scan:", firstFinding!.scan.id)

        //clone-repo
        const authHeader = req.headers.authorization;
        const cookieHeader = req.headers.cookie;
        const headers: Record<string, string> = {};
        if (authHeader) {
            headers['Authorization'] = authHeader;
        }
        if (cookieHeader) {
            headers['Cookie'] = cookieHeader;
        }

        const repo = await axios.get(
            `${process.env.APP_INTEGRATION_SERVICE_URL}/api/v1/repos/${firstFinding!.scan.repositoryId}`,
            { headers }
        )
        const repoUrl = repo.data.data.repo_url;

        const clonePath = path.join(process.cwd(), "fixes", firstFinding!.scan.id);
        if (fs.existsSync(clonePath)) {
            await fs.promises.rm(clonePath, { recursive: true, force: true });
        }
        await cloneRepo(repoUrl, clonePath);

        console.log("Cloning complete to path: ", clonePath)

        // Group findings by filePath (sanitized)
        const findingsByFile: Record<string, typeof findings> = {};
        for (const f of findings) {
            const sanitizedPath = f.filePath.replace(/^\/?(repo|src)\//, "");
            if (!findingsByFile[sanitizedPath]) {
                findingsByFile[sanitizedPath] = [];
            }
            findingsByFile[sanitizedPath].push(f);
        }

        const results = [];

        // For each file, read content, get multiple code fixes from Gemini, write back to file
        for (const [sanitizedPath, fileFindings] of Object.entries(findingsByFile)) {
            const targetFile = path.join(clonePath, sanitizedPath);
            let fileContent = "";
            try {
                fileContent = await fs.promises.readFile(targetFile, 'utf-8');
            } catch (e) {
                console.error(`Failed to read file ${targetFile}:`, e);
                continue;
            }

            console.log(`Getting fixes for file ${sanitizedPath} with ${fileFindings.length} findings...`);
            const { explanation, fixedCode } = await getMultipleCodeFixes(
                sanitizedPath,
                fileContent,
                fileFindings.map(f => ({
                    title: f.title,
                    description: f.description,
                    line: f.line ?? 1
                }))
            );

            console.log("Got fixes by gemini for all findings.. Now writting back to repo..")

            // Backup original file
            await fs.promises.copyFile(targetFile, `${targetFile}.bak`);
            // Write the fixed file content back to the cloned repo
            await fs.promises.writeFile(targetFile, fixedCode, 'utf-8');

            results.push({
                filePath: sanitizedPath,
                explanation,
                fixedCode
            });
        }

        console.log("Updations done..Updating findings status to Resolved..")

        // Update findings to RESOLVED status in db
        await prisma.finding.updateMany({
            where: { id: { in: ids } },
            data: { status: "RESOLVED" }
        });

        return res.status(200).json({
            message: "All fixes applied successfully",
            results
        });
    } catch (err) {
        console.log(err)
        return res.status(500).json({ message: "Internal server error" })
    }
}
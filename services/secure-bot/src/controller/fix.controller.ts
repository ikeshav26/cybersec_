import type { Request, Response } from "express";
import { prisma } from "../config/db.js";
import axios from "axios";
import { cloneRepo } from "../utils/clone-repo.js";
import fs from 'fs'
import { getCodeFix, getMultipleCodeFixes } from "../config/gemini.js";
import path from 'path'
import { App, Octokit } from "octokit";


const githubApp = new App({
    appId: process.env.GITHUB_APP_ID!,
    privateKey: process.env.GITHUB_PRIVATE_KEY!.replace(/\\n/g, '\n'),
})


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


export const openPullRequestForFix = async (req: Request, res: Response) => {
    try {
        const scanId = req.params.scanId || req.body.scanId;
        if (!scanId) {
            return res.status(400).json({ message: "Scan id is required to open PR..!" })
        }

        const authHeader = req.headers.authorization;
        const token = req.cookies.token || (authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader);
        if (!token) {
            return res.status(401).json({ message: "Unauthorized" })
        }

        const scan = await prisma.scan.findUnique({
            where: { id: String(scanId) }
        })

        if (!scan) {
            return res.status(404).json({ message: "Scan not found" })
        }

        const repo = await axios.get(
            `${process.env.APP_INTEGRATION_SERVICE_URL}/api/v1/repos/${scan.repositoryId}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        )

        const repoData = repo.data.data;
        const repoUrl = repoData.repo_url;
        const installationId = repoData.installationId;

        // Parse owner and repo from e.g. "https://github.com/owner/repo"
        const repoParts = repoUrl.replace(/\/$/, "").split("/");
        const repoName = repoParts.pop() || "";
        const owner = repoParts.pop() || "";

        // Authenticate using the GitHub App installation client
        const octokit = await githubApp.getInstallationOctokit(Number(installationId));

        const baseBranch = "main";
        const branch = await octokit.rest.repos.getBranch({
            owner,
            repo: repoName,
            branch: baseBranch
        })

        // Find all RESOLVED findings for this scan
        const findings = await prisma.finding.findMany({
            where: {
                scanId: scan.id,
                status: "RESOLVED"
            }
        })

        if (findings.length === 0) {
            return res.status(400).json({ message: "No resolved findings found to commit for this scan." })
        }

        // Group findings by file path to commit each file once
        const findingsByFile = new Map<string, typeof findings>();
        for (const f of findings) {
            const sanitizedPath = f.filePath.replace(/^\/?(repo|src)\//, "");
            if (!findingsByFile.has(sanitizedPath)) {
                findingsByFile.set(sanitizedPath, []);
            }
            findingsByFile.get(sanitizedPath)!.push(f);
        }

        const headBranch = `safe-patch-${scan.id}`;

        try {
            // Create the new branch reference pointing to the main branch commit SHA
            await octokit.rest.git.createRef({
                owner,
                repo: repoName,
                ref: `refs/heads/${headBranch}`,
                sha: branch.data.commit.sha
            });
        } catch (e: any) {
            if (e.status === 422 && (e.message?.includes("already exists") || JSON.stringify(e).includes("already exists"))) {
                console.log(`Branch ${headBranch} already exists, proceeding with existing branch.`);
            } else {
                throw e;
            }
        }

        const clonePath = path.join(process.cwd(), "fixes", scan.id);

        // Commit each modified file to the new branch
        for (const sanitizedPath of findingsByFile.keys()) {
            const filePathOnDisk = path.join(clonePath, sanitizedPath);
            if (!fs.existsSync(filePathOnDisk)) {
                continue;
            }

            const fileContent = await fs.promises.readFile(filePathOnDisk, 'utf-8');

            // Retrieve current file details (need the current blob sha for update)
            let currentSha: string | undefined = undefined;
            try {
                const existingFile = await octokit.rest.repos.getContent({
                    owner,
                    repo: repoName,
                    path: sanitizedPath,
                    ref: headBranch
                });
                if (!Array.isArray(existingFile.data) && existingFile.data.type === 'file') {
                    currentSha = existingFile.data.sha;
                }
            } catch (e) {
                console.log(`File ${sanitizedPath} not found in repo, creating a new file.`);
            }

            console.log("Creating commit for file: ", sanitizedPath)
            // Commit the updated file content to the new branch
            const commitParams: any = {
                owner,
                repo: repoName,
                path: sanitizedPath,
                message: `fix: resolve vulnerabilities in ${sanitizedPath}`,
                content: Buffer.from(fileContent).toString("base64"),
                branch: headBranch
            };
            if (currentSha) {
                commitParams.sha = currentSha;
            }

            await octokit.rest.repos.createOrUpdateFileContents(commitParams);
        }

        console.log("Creating Pull Request..")

        let prData;
        try {
            // Open the Pull Request on GitHub
            const pr = await octokit.rest.pulls.create({
                owner,
                repo: repoName,
                title: `🛡️ Security Fixes for Scan #${scan.id.substring(0, 8)}`,
                body: `This automated Pull Request resolves identified vulnerabilities in the repository. Please review the changes and merge when ready.\n\n### Resolved Findings:\n` +
                    findings.map(f => `- **${f.title}** (${f.severity} severity) in \`${f.filePath}:${f.line}\``).join('\n'),
                head: headBranch,
                base: baseBranch
            });
            prData = pr.data;
        } catch (e: any) {
            if (e.status === 422 && (e.message?.includes("already exists") || JSON.stringify(e).includes("already exists"))) {
                console.log("PR already exists, listing pulls to find the existing one...");
                const pulls = await octokit.rest.pulls.list({
                    owner,
                    repo: repoName,
                    state: "open"
                });
                const existingPr = pulls.data.find(p => p.head.ref === headBranch);
                if (existingPr) {
                    prData = existingPr;
                } else {
                    throw e;
                }
            } else {
                throw e;
            }
        }

        //delete the clone-repo
        console.log("Deleting cloned repo... at path:", clonePath)
        try {
            await fs.promises.rm(clonePath, { recursive: true });
            console.log("Cloned repo deleted at path:", clonePath)
        } catch (e) {
            console.error("Failed to delete cloned repo:", e);
        }

        return res.status(200).json({ message: "PR opened successfully", pr: prData })

    } catch (err) {
        console.log(err)
        return res.status(500).json({ message: "Internal server error" })
    }
}
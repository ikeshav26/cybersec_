import type { Request, Response } from "express";
import { prisma } from "../config/db.js";
import axios from "axios";
import { App } from "octokit";
import path from 'path'
import fs from 'fs'



const githubApp = new App({
    appId: process.env.GITHUB_APP_ID!,
    privateKey: process.env.GITHUB_PRIVATE_KEY!.replace(/\\n/g, '\n'),
})



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
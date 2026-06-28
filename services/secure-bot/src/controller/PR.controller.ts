import type { Request, Response } from 'express'
import { prisma } from '../config/db.js'
import axios from 'axios'
import { App } from 'octokit'
import path from 'path'
import fs from 'fs'
import { cloneRepo } from '../utils/clone-repo.js'
import { asyncExec } from '../utils/exec.js'

const githubApp = new App({
  appId: process.env.GITHUB_APP_ID!,
  privateKey: process.env.GITHUB_PRIVATE_KEY!.replace(/\\n/g, '\n'),
})

export const openPullRequestForFix = async (req: Request, res: Response) => {
  try {
    const scanId = req.params.scanId || req.body.scanId
    if (!scanId) {
      return res.status(400).json({ message: 'Scan id is required to open PR..!' })
    }

    const authHeader = req.headers.authorization
    const token =
      req.cookies.token ||
      (authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.split(' ')[1]
        : authHeader)
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const scan = await prisma.scan.findUnique({
      where: { id: String(scanId) },
    })

    if (!scan) {
      return res.status(404).json({ message: 'Scan not found' })
    }

    const repo = await axios.get(
      `${process.env.APP_INTEGRATION_SERVICE_URL}/api/v1/repos/${scan.repositoryId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    )

    const repoData = repo.data.data
    const repoUrl = repoData.repo_url
    const installationId = repoData.installationId

    // Parse owner and repo from e.g. "https://github.com/owner/repo"
    const repoParts = repoUrl.replace(/\/$/, '').split('/')
    const repoName = repoParts.pop() || ''
    const owner = repoParts.pop() || ''

    // Authenticate using the GitHub App installation client
    const octokit = await githubApp.getInstallationOctokit(Number(installationId))

    const baseBranch = 'main'
    const branch = await octokit.rest.repos.getBranch({
      owner,
      repo: repoName,
      branch: baseBranch,
    })

    // Find all RESOLVED findings for this scan
    const findings = await prisma.finding.findMany({
      where: {
        scanId: scan.id,
        status: 'RESOLVED',
      },
    })

    if (findings.length === 0) {
      return res
        .status(400)
        .json({ message: 'No resolved findings found to commit for this scan.' })
    }

    // Group findings by file path to commit each file once
    const findingsByFile = new Map<string, typeof findings>()
    for (const f of findings) {
      const sanitizedPath = f.filePath.replace(/^\/?(repo|src)\//, '')
      if (!findingsByFile.has(sanitizedPath)) {
        findingsByFile.set(sanitizedPath, [])
      }
      findingsByFile.get(sanitizedPath)!.push(f)
    }

    const headBranch = `safe-patch-${scan.id}`

    try {
      // Create the new branch reference pointing to the main branch commit SHA
      await octokit.rest.git.createRef({
        owner,
        repo: repoName,
        ref: `refs/heads/${headBranch}`,
        sha: branch.data.commit.sha,
      })
    } catch (e: any) {
      if (
        e.status === 422 &&
        (e.message?.includes('already exists') ||
          JSON.stringify(e).includes('already exists'))
      ) {
        console.log(
          `Branch ${headBranch} already exists, proceeding with existing branch.`,
        )
      } else {
        throw e
      }
    }

    const clonePath = path.join(process.cwd(), 'fixes', scan.id)

    // Re-clone repository if the local cache has been cleared
    if (!fs.existsSync(clonePath)) {
      console.log('Local clone path does not exist. Re-cloning repository to stage PR fixes...')
      await cloneRepo(repoUrl, clonePath)
    }

    // Ensure all modified files are written using the database's fixedCode (which is the source of truth for resolved fixes)
    for (const sanitizedPath of findingsByFile.keys()) {
      const filePathOnDisk = path.join(clonePath, sanitizedPath)
      console.log(`Applying resolved fixes for: ${sanitizedPath} from database...`)
      const fileFindings = findingsByFile.get(sanitizedPath) || []
      const findingWithFix = fileFindings.find(f => f.rawDetails && (f.rawDetails as any).fixedCode)
      if (findingWithFix) {
        const fixedCode = (findingWithFix.rawDetails as any).fixedCode
        await fs.promises.mkdir(path.dirname(filePathOnDisk), { recursive: true })
        await fs.promises.writeFile(filePathOnDisk, fixedCode, 'utf-8')
        console.log(`Successfully wrote ${sanitizedPath} content from database.`)
      } else {
        console.warn(`Could not find saved fixedCode in database for ${sanitizedPath}.`)
      }
    }

    try {
      // Configure local git settings
      await asyncExec(`git config user.name "Aegis Secure Bot"`, { cwd: clonePath })
      await asyncExec(`git config user.email "bot@aegis.security"`, { cwd: clonePath })

      // Ensure local git ignores .bak files
      const excludePath = path.join(clonePath, '.git', 'info', 'exclude')
      if (fs.existsSync(path.dirname(excludePath))) {
        await fs.promises.appendFile(excludePath, '\n*.bak\n', 'utf-8')
      }

      // Create and checkout branch
      try {
        await asyncExec(`git checkout -b ${headBranch}`, { cwd: clonePath })
      } catch (err) {
        await asyncExec(`git checkout ${headBranch}`, { cwd: clonePath })
      }

      // Add all changes
      await asyncExec(`git add -A`, { cwd: clonePath })

      // Check if we actually have changes staged
      const { stdout: statusOut } = await asyncExec(`git status --porcelain`, { cwd: clonePath })
      if (!statusOut.trim()) {
        console.log('No file changes detected compared to main branch. Skipping PR.')
        try {
          await fs.promises.rm(clonePath, { recursive: true })
        } catch (e) {}
        return res.status(400).json({
          message: 'No file changes detected compared to the main branch. Pull Request was not created.'
        })
      }

      // Commit changes at once (Single commit)
      await asyncExec(`git commit -m "shield: resolve vulnerabilities in scan #${scan.id.substring(0, 8)}"`, { cwd: clonePath })

      // Retrieve authentication token to push
      const auth: any = await octokit.auth({ type: 'installation' })
      const token = auth.token
      const pushUrl = `https://x-access-token:${token}@github.com/${owner}/${repoName}.git`

      // Force push branch to remote
      console.log(`Pushing commit to branch ${headBranch}...`)
      await asyncExec(`git push --force "${pushUrl}" ${headBranch}`, { cwd: clonePath })
      console.log(`Branch ${headBranch} pushed successfully!`)

    } catch (gitErr: any) {
      console.error('Git execution failed:', gitErr)
      try {
        await fs.promises.rm(clonePath, { recursive: true })
      } catch (e) {}

      const errMsg = gitErr.message || String(gitErr)
      if (errMsg.includes('.github/workflows') || errMsg.includes('workflow')) {
        return res.status(403).json({
          message: `Failed to push changes to GitHub. Aegis GitHub App requires the "Workflows: Read & Write" permission to update GitHub Action workflow files. Please enable it in the GitHub App settings.`
        })
      }

      return res.status(500).json({
        message: `Failed to commit/push fixes via Git: ${gitErr.message || gitErr}`
      })
    }

    console.log('Creating Pull Request..')

    let prData
    try {
      // Open the Pull Request on GitHub
      const pr = await octokit.rest.pulls.create({
        owner,
        repo: repoName,
        title: `🛡️ Security Fixes for Scan #${scan.id.substring(0, 8)}`,
        body:
          `This automated Pull Request resolves identified vulnerabilities in the repository. Please review the changes and merge when ready.\n\n### Resolved Findings:\n` +
          findings
            .map(
              (f) =>
                `- **${f.title}** (${f.severity} severity) in \`${f.filePath}:${f.line}\``,
            )
            .join('\n'),
        head: headBranch,
        base: baseBranch,
      })
      prData = pr.data
    } catch (e: any) {
      if (
        e.status === 422 &&
        (e.message?.includes('already exists') ||
          JSON.stringify(e).includes('already exists'))
      ) {
        console.log('PR already exists, listing pulls to find the existing one...')
        const pulls = await octokit.rest.pulls.list({
          owner,
          repo: repoName,
          state: 'open',
        })
        const existingPr = pulls.data.find((p) => p.head.ref === headBranch)
        if (existingPr) {
          prData = existingPr
        } else {
          throw e
        }
      } else {
        throw e
      }
    }

    //delete the clone-repo
    console.log('Deleting cloned repo... at path:', clonePath)
    try {
      await fs.promises.rm(clonePath, { recursive: true })
      console.log('Cloned repo deleted at path:', clonePath)
    } catch (e) {
      console.error('Failed to delete cloned repo:', e)
    }

    return res.status(200).json({ message: 'PR opened successfully', pr: prData })
  } catch (err) {
    console.log(err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export const getPullRequestUrl = async (req: Request, res: Response) => {
  try {
    const scanId = req.params.scanId
    if (!scanId) {
      return res.status(400).json({ message: 'Scan id is required' })
    }

    const authHeader = req.headers.authorization
    const token =
      req.cookies.token ||
      (authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.split(' ')[1]
        : authHeader)
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const scan = await prisma.scan.findUnique({
      where: { id: String(scanId) },
    })

    if (!scan) {
      return res.status(404).json({ message: 'Scan not found' })
    }

    const repo = await axios.get(
      `${process.env.APP_INTEGRATION_SERVICE_URL}/api/v1/repos/${scan.repositoryId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    )

    const repoData = repo.data.data
    const repoUrl = repoData.repo_url
    const installationId = repoData.installationId

    const repoParts = repoUrl.replace(/\/$/, '').split('/')
    const repoName = repoParts.pop() || ''
    const owner = repoParts.pop() || ''

    const octokit = await githubApp.getInstallationOctokit(Number(installationId))
    const headBranch = `safe-patch-${scan.id}`

    const pulls = await octokit.rest.pulls.list({
      owner,
      repo: repoName,
      state: 'all',
    })

    const existingPr = pulls.data.find((p) => p.head.ref === headBranch)

    if (existingPr) {
      return res.status(200).json({ prUrl: existingPr.html_url })
    }

    return res.status(404).json({ message: 'PR not found for this scan' })
  } catch (err) {
    console.log(err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

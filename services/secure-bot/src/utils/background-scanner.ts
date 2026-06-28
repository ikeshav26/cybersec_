import path from 'path'
import { prisma } from '../config/db.js'
import { cloneRepo } from './clone-repo.js'
import { getFindingByGitleaks } from './scans/gitleaks.scans.js'
import fs from 'fs'
import { getFindingsBySemgrep } from './scans/semgrep.scan.js'
import { getFindingByTrivy } from './scans/trivy.scan.js'

export async function runBackgroundScan(
  scanId: string,
  repoUrl: string,
  installationId: string,
) {
  console.log(`Starting scan for scanId:${scanId}:`)
  const clonePath = path.join(process.cwd(), 'scans', scanId)
  try {
    console.log(`Updating scan status to IN_PROGRESS for scanId:${scanId}:`)
    await prisma.scan.update({
      where: {
        id: scanId,
      },
      data: {
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      },
    })

    console.log(`Cloning repository for scanId:${scanId}:`)
    await cloneRepo(repoUrl, clonePath)

    const [gitleaks, semgrep, trivy] = await Promise.all([
      getFindingByGitleaks(scanId, clonePath),
      getFindingsBySemgrep(scanId, clonePath),
      getFindingByTrivy(scanId, clonePath),
    ])

    const findings = [...gitleaks, ...semgrep, ...trivy]
    const filteredFindings = findings.filter((finding) => !shouldIgnore(finding.filePath))

    console.log(
      `Scan completed for scanId:${scanId}. Total findings: ${findings.length}, Filtered: ${
        findings.length - filteredFindings.length
      }`,
    )

    if (filteredFindings.length > 0) {
      await prisma.finding.createMany({
        data: filteredFindings,
      })
    }

    console.log(`Updating scan status to SUCCESS for scanId:${scanId}:`)
    await prisma.scan.update({
      where: {
        id: scanId,
      },
      data: {
        status: 'SUCCESS',
        completedAt: new Date(),
      },
    })
  } catch (err: any) {
    console.log(`Error updating scan for scanId:${scanId}:`, err)
    await prisma.scan.update({
      where: {
        id: scanId,
      },
      data: {
        status: 'FAILED',
        error: err instanceof Error ? err.message : 'Internal scanning error',
        completedAt: new Date(),
      },
    })
    return err
  } finally {
    try {
      if (fs.existsSync(clonePath)) {
        await fs.promises.rm(clonePath, { recursive: true, force: true })
        console.log(`Cleaned up temp directory: ${clonePath}`)
      }
    } catch (cleanupErr) {
      console.error('Cleanup failed:', cleanupErr)
    }
  }
}

function shouldIgnore(filePath: string): boolean {
  if (!filePath) return false

  // Clean the file path: strip any leading slashes and any leading repo/ or src/ prefix
  const cleanPath = filePath.replace(/^\/?(repo|src)\//, '').replace(/^\//, '')

  // Exact file names to ignore
  const ignoreFiles = ['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock']
  const fileName = cleanPath.split('/').pop()
  if (fileName && ignoreFiles.includes(fileName)) {
    return true
  }

  // Directory names to ignore
  const ignoreDirs = ['node_modules', 'dist', 'build', 'coverage', '.next']
  const pathParts = cleanPath.split('/')
  if (pathParts.some((part) => ignoreDirs.includes(part))) {
    return true
  }

  return false
}

import path from 'path'
import fs from 'fs'
import { asyncExec } from '../exec.js'

export const getFindingByGitleaks = async (scanId: string, repoPath: string) => {
  const reportPath = path.join(repoPath, 'gitleaks.json')

  try {
    await asyncExec(`
      docker run --rm \
      -v ${repoPath}:/repo \
      ghcr.io/gitleaks/gitleaks:latest detect \
      --source=/repo \
      --report-path=/repo/gitleaks.json \
      --no-git
    `)
  } catch (err: any) {
    if (err.code !== 1) {
      throw err
    }
  }

  try {
    const report = await fs.promises.readFile(reportPath, 'utf-8')
    const findings = JSON.parse(report!)

    return findings.map((finding: any) => ({
      scanId,
      tool: 'GITLEAKS',
      severity: 'CRITICAL',
      status: 'OPEN',
      title: finding.Description,
      description: finding.Description,
      filePath: finding.File,
      line: finding.StartLine,
      rawDetails: finding,
    }))
  } catch (err) {
    console.log(err)
    return []
  }
}

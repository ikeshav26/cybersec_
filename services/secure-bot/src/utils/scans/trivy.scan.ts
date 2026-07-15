/**
 * Copyright (c) 2026 Keshav Gilhotra. All Rights Reserved.
 * This file is part of a proprietary project. Unauthorized copying is strictly prohibited.
 */

import path from 'path'
import fs from 'fs'
import { asyncExec } from '../exec.js'

const mapSeverity = (
  severity: string,
): 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' => {
  switch (severity?.toUpperCase()) {
    case 'CRITICAL':
      return 'CRITICAL'
    case 'HIGH':
      return 'HIGH'
    case 'MEDIUM':
      return 'MEDIUM'
    case 'LOW':
      return 'LOW'
    case 'INFO':
    default:
      return 'INFO'
  }
}

export const getFindingByTrivy = async (scanId: string, repoPath: string) => {
  const reportPath = path.join(repoPath, 'trivy.json')
  console.log('trivy starts at:', new Date())
  try {
    await asyncExec(`
            docker run --rm \
                -v ${repoPath}:/repo \
                aquasec/trivy:latest \
                fs /repo \
                --format json \
                -o /repo/trivy.json
        `)
  } catch (err: any) {
    if (err.code !== 1) {
      throw err
    }
  }

  try {
    const report = await fs.promises.readFile(reportPath, 'utf-8')
    const data = JSON.parse(report)

    const findings = []

    for (const result of data.Results || []) {
      for (const vuln of result.Vulnerabilities || []) {
        findings.push({
          scanId,
          tool: 'TRIVY' as const,
          severity: mapSeverity(vuln.Severity),
          status: 'OPEN' as const,
          title: vuln.Title || vuln.VulnerabilityID || 'Trivy Finding',
          description: vuln.Description || vuln.Title || 'No description provided',
          filePath: result.Target || 'unknown',
          line: null as number | null,
          rawDetails: vuln,
        })
      }
    }
    return findings
  } catch (err) {
    console.error('Error reading/parsing Trivy report:', err)
    return []
  } finally {
    console.log('trivy finished at:', new Date())
  }
}

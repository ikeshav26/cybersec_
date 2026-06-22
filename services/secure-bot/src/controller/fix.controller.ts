import type { Request, Response } from 'express'
import { cloneRepo } from '../utils/clone-repo.js'
import fs from 'fs'
import { getCodeFix } from '../config/ai.js'
import path from 'path'
import {
  getFindingById,
  getFindings,
  getFindingsByFile,
  getRepoFromRepoID,
  readAndWrittingFixesBack,
  updateFindingStatus,
} from '../utils/fixes/helper.js'

export const fixFinding = async (req: Request, res: Response) => {
  try {
    const { findingId } = req.params
    if (!findingId) {
      return res.status(400).json({ message: 'Finding ID is required' })
    }

    const id = String(findingId)
    console.log('Finding id received:', id, ' Now finding..Finding for id:', id)

    //step-1 (fetching finding details)
    const finding = await getFindingById(id)

    if (!finding) {
      return res.status(404).json({ message: 'Finding not found' })
    }

    console.log('Findings received, going to clone repo...')

    //step-2 (cloning-repo)
    const repo = await getRepoFromRepoID(req, finding.scan.repositoryId)
    if (!repo) {
      return res.status(400).json({ message: 'Could not get repo details' })
    }
    const repoUrl = repo.data.data.repo_url

    const clonePath = path.join(process.cwd(), 'fixes', finding.scan.id)
    if (fs.existsSync(clonePath)) {
      await fs.promises.rm(clonePath, { recursive: true, force: true })
    }
    await cloneRepo(repoUrl, clonePath)

    console.log('Cloning complete to path: ', clonePath)

    //step-3 (reading file content)
    console.log('Now reading file content')
    const targetFile = path.join(
      clonePath,
      finding.filePath.replace(/^\/?(repo|src)\//, ''),
    )
    const content = await fs.promises.readFile(targetFile, 'utf-8')
    const lines = content.split('\n')

    const lineNum = finding.line ?? 1
    const start = Math.max(0, lineNum - 15)
    const end = Math.min(lines.length, lineNum + 15)

    const context = lines.slice(start, end).join('\n')

    console.log('Extracting content by reading file done..')

    //step-4 (fixes by model)
    console.log('Now fixing code... using models')
    const { explanation, fixedCode } = await getCodeFix(finding, content, context)

    if (!explanation || !fixedCode) {
      return res.status(400).json({ message: 'Could not generate fix' })
    }

    console.log('Fix generated successfully..')
    //update code
    const fixedFilePath = path.join(
      clonePath,
      finding.filePath.replace(/^\/?(repo|src)\//, ''),
    )
    // Backup original file
    await fs.promises.copyFile(fixedFilePath, `${fixedFilePath}.bak`)
    await fs.promises.writeFile(fixedFilePath, fixedCode, 'utf-8')

    // Update status in DB
    const isUpdated = await updateFindingStatus([finding.id])
    if (!isUpdated) {
      return res.status(400).json({ message: 'Failed to update finding status' })
    }

    return res
      .status(200)
      .json({
        message: 'Fix applied successfully',
        code: fixedCode,
        explanation: explanation,
      })
  } catch (err) {
    console.log(err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export const fixAllFindings = async (req: Request, res: Response) => {
  try {
    const { findingIds } = req.body
    if (!findingIds || !Array.isArray(findingIds) || findingIds.length === 0) {
      return res.status(400).json({ message: 'findingIds array is required' })
    }

    // step-1 (get findings from ids)
    const { findings, ids } = await getFindings(findingIds)
    if (!findings || findings.length === 0) {
      return res.status(404).json({ message: 'No findings found for provided IDs' })
    }
    const firstFinding = findings[0]
    console.log('Findings received, going to clone repo for scan:', firstFinding?.scan.id)

    //setp-2 (clone-repo to make fixes)
    const repo = await getRepoFromRepoID(req, firstFinding!.scan.repositoryId)
    if (!repo) {
      return res.status(400).json({ message: 'Could not get repo details' })
    }
    const repoUrl = repo.data.data.repo_url
    const clonePath = path.join(process.cwd(), 'fixes', firstFinding!.scan.id)
    if (fs.existsSync(clonePath)) {
      await fs.promises.rm(clonePath, { recursive: true, force: true })
    }
    await cloneRepo(repoUrl, clonePath)
    console.log('Cloning complete to path: ', clonePath)

    //step-3 (reading files and writting fixes back to files)
    const findingsByFile = await getFindingsByFile(findings)
    if (!findingsByFile) {
      return res.status(400).json({ message: 'Could not get findings by file' })
    }
    const results = await readAndWrittingFixesBack(findingsByFile, clonePath)
    console.log('Updations done..Updating findings status to Resolved..')

    // step-4 (update finding status)
    const isUpdated = await updateFindingStatus(ids)
    if (!isUpdated) {
      return res.status(400).json({ message: 'Failed to update findings status' })
    }

    return res.status(200).json({
      message: 'All fixes applied successfully',
      results,
    })
  } catch (err) {
    console.log(err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

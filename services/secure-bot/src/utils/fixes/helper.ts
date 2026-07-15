/**
 * Copyright (c) 2026 Keshav Gilhotra. All Rights Reserved.
 * This file is part of a proprietary project. Unauthorized copying is strictly prohibited.
 */

import type { Request } from 'express'
import { prisma } from '../../config/db.js'
import axios from 'axios'
import path from 'path'
import fs from 'fs'
import { getMultipleCodeFixes } from '../../config/ai.js'
import { createPatch } from 'diff'

export const getFindings = async (findingIds: any) => {
  try {
    const ids = findingIds.map((item: any) =>
      typeof item === 'object' && item !== null ? String(item.id) : String(item),
    )
    console.log('Retrieving findings for IDs:', ids)

    const findings = await prisma.finding.findMany({
      where: {
        id: { in: ids },
      },
      include: {
        scan: {
          select: {
            id: true,
            repositoryId: true,
          },
        },
      },
    })

    return { findings, ids }
  } catch (err) {
    console.log(err)
    return { findings: [], ids: [] }
  }
}

export const getRepoFromRepoID = async (req: Request, repoId: String) => {
  try {
    const authHeader = req.headers.authorization
    const cookieHeader = req.headers.cookie
    const headers: Record<string, string> = {}
    if (authHeader) {
      headers['Authorization'] = authHeader
    }
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader
    }

    const repo = await axios.get(
      `${process.env.APP_INTEGRATION_SERVICE_URL}/api/v1/repos/${repoId}`,
      { headers },
    )
    console.log('Repo found for repo ID')
    return repo
  } catch (err) {
    console.log(err)
    return null
  }
}

export const getFindingById = async (id: string) => {
  try {
    const finding = await prisma.finding.findUnique({
      where: { id },
      include: {
        scan: {
          select: {
            id: true,
            repositoryId: true,
          },
        },
      },
    })
    return finding
  } catch (err) {
    console.log(err)
    return null
  }
}

export const readAndWrittingFixesBack = async (
  findingsByFile: Record<string, any[]>,
  clonePath: string,
) => {
  try {
    const results = []
    for (const [sanitizedPath, fileFindings] of Object.entries(findingsByFile)) {
      try {
        const targetFile = path.join(clonePath, sanitizedPath)
        let fileContent = ''
        try {
          fileContent = await fs.promises.readFile(targetFile, 'utf-8')
        } catch (e) {
          console.error(`Failed to read file ${targetFile}:`, e)
          continue
        }

        console.log(
          `Getting fixes for file ${sanitizedPath} with ${fileFindings.length} findings...`,
        )
        const { explanation, fixedCode } = await getMultipleCodeFixes(
          sanitizedPath,
          fileContent,
          fileFindings?.map((f: any) => ({
            title: f.title,
            description: f.description,
            line: f.line ?? 1,
          })),
        )

        if (!explanation || !fixedCode) {
          console.error(`Failed to generate code fixes for ${sanitizedPath}`)
          continue
        }

        if (fixedCode === fileContent) {
          console.warn(`AI model did not make any modifications to ${sanitizedPath}`)
          continue
        }

        console.log('Got fixes by gemini for all findings.. Now writting back to repo..')

        await fs.promises.copyFile(targetFile, `${targetFile}.bak`)
        await fs.promises.writeFile(targetFile, fixedCode, 'utf-8')

        const diffContent = computeUnifiedDiff(fileContent, fixedCode)

        results.push({
          filePath: sanitizedPath,
          explanation,
          fixedCode: diffContent,
          fixedFileContent: fixedCode,
        })
      } catch (fileErr) {
        console.error(`Error processing fixes for ${sanitizedPath}:`, fileErr)
      }
    }
    return results
  } catch (err) {
    console.log(err)
    return []
  }
}

export const getFindingsByFile = async (findings: Array<any>) => {
  try {
    const findingsByFile: Record<string, any[]> = {}
    for (const f of findings) {
      const sanitizedPath = f.filePath.replace(/^\/?(repo|src)\//, '')
      if (!findingsByFile[sanitizedPath]) {
        findingsByFile[sanitizedPath] = []
      }
      findingsByFile[sanitizedPath].push(f)
    }
    return findingsByFile
  } catch (err) {
    console.log(err)
    return {}
  }
}

export const updateFindingStatus = async (ids: Array<any>) => {
  try {
    await prisma.finding.updateMany({
      where: { id: { in: ids } },
      data: { status: 'RESOLVED' },
    })
    return true
  } catch (err) {
    console.log(err)
    return false
  }
}

export const updateFindingFixDetails = async (id: string, diff: string, explanation: string, fixedCode: string) => {
  try {
    const rawDetails = {
      fixDiff: diff,
      fixExplanation: explanation,
      fixedCode: fixedCode
    }
    
    await prisma.finding.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        rawDetails
      }
    })
    return true
  } catch (err) {
    console.log('Error updating finding fix details:', err)
    return false
  }
}

export const saveFixDetailsToFindings = async (findings: Array<any>, results: Array<any>) => {
  try {
    for (const f of findings) {
      const sanitizedPath = f.filePath.replace(/^\/?(repo|src)\//, '')
      const result = results.find(r => r.filePath === sanitizedPath)
      if (result) {
        const rawDetails = {
          fixDiff: result.fixedCode,
          fixExplanation: result.explanation,
          fixedCode: result.fixedFileContent
        }
        
        await prisma.finding.update({
          where: { id: f.id },
          data: {
            status: 'RESOLVED',
            rawDetails
          }
        })
      } else {
        console.warn(`No fix was applied to ${sanitizedPath}, keeping status as OPEN.`)
      }
    }
    return true
  } catch (err) {
    console.log('Error saving fix details to findings:', err)
    return false
  }
}

export function computeUnifiedDiff(original: string, modified: string, contextSize = 3): string {
  // Use createPatch from standard 'diff' library
  const patch = createPatch('file', original, modified, undefined, undefined, { context: contextSize })
  // Strip header lines (Index: file, ===, ---, +++) to make it clean for the user
  const lines = patch.split('\n')
  return lines.slice(4).join('\n')
}

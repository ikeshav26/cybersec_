import type { Request } from 'express'
import { prisma } from '../../config/db.js'
import axios from 'axios'
import path from 'path'
import fs from 'fs'
import { getMultipleCodeFixes } from '../../config/ai.js'

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
    console.log('Repo found for repo ID', repo)
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

      console.log('Got fixes by gemini for all findings.. Now writting back to repo..')

      await fs.promises.copyFile(targetFile, `${targetFile}.bak`)
      await fs.promises.writeFile(targetFile, fixedCode, 'utf-8')

      results.push({
        filePath: sanitizedPath,
        explanation,
        fixedCode,
      })
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

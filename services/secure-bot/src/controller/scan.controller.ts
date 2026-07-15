/**
 * Copyright (c) 2026 Keshav Gilhotra. All Rights Reserved.
 * This file is part of a proprietary project. Unauthorized copying is strictly prohibited.
 */

import type { Request, Response } from 'express'
import { prisma } from '../config/db.js'
import axios from 'axios'
import { runBackgroundScan } from '../utils/background-scanner.js'
import { scanQueue } from '../queues/scan.queue.js'

export const scanRepo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    if (!id) {
      return res.status(400).json({ message: 'Please provide id' })
    }

    const token = req.cookies.token || req.headers.authorization?.split(' ')[1]

    if (!token) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    //step-1
    const appIntegrationServiceUrl =
      process.env.APP_INTEGRATION_SERVICE_BASE_URL || 'http://localhost:5001'
    const repoResponse = await axios.get(
      `${appIntegrationServiceUrl}/api/v1/repos/${id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    )

    if (repoResponse.status != 200) {
      return res
        .status(repoResponse.status)
        .json({ message: 'Failed to fetch repository' })
    }

    const repo = repoResponse.data.data

    //step-2
    const scan = await prisma.scan.create({
      data: {
        repositoryId: repo.id,
        status: 'QUEUED',
        branch: 'main',
      },
    })

    //step-3

    console.log('Adding to queue : ', scan)

    await scanQueue.add('repo-scan', {
      scanId: scan.id,
      repoId: repo.id,
      repoUrl: repo.repo_url,
      installationId: repo.installationId,
    })

    return res.status(202).json({
      success: true,
      message: 'Scan initiated successfully',
      data: scan,
    })
  } catch (err) {
    console.log(err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export const getScanStatus = async (req: Request, res: Response) => {
  try {
    const { scanId } = req.params
    if (!scanId) {
      return res.status(400).json({ message: 'Please provide scanId' })
    }

    const id = String(scanId)
    const scan = await prisma.scan.findUnique({
      where: {
        id: id,
      },
      include: {
        findings: true,
      },
    })

    if (!scan) {
      return res.status(404).json({ message: 'Scan not found' })
    }

    return res.status(200).json({
      success: true,
      message: 'Scan fetched successfully',
      data: scan,
    })
  } catch (err) {
    console.log(err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export const removeRepoScanAndFindings = async (req: Request, res: Response) => {
  try {
    const { repoId } = req.params

    if (!repoId) {
      return res.status(400).json({ message: 'Please provide repoId' })
    }

    const id = String(repoId)

    console.log('Deleting findings for repoId:', id)
    await prisma.finding.deleteMany({
      where: {
        scan: {
          repositoryId: id,
        },
      },
    })

    console.log('Deleting scans for repoId:', id)
    await prisma.scan.deleteMany({
      where: {
        repositoryId: id,
      },
    })

    return res.status(200).json({ message: 'Scans and findings deleted successfully' })
  } catch (err) {
    console.log(err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export const getScanHistory = async (req: Request, res: Response) => {
  try {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1]
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 9
    const skip = (page - 1) * limit
    const onlyResolved = req.query.onlyResolved === 'true'

    const appIntegrationServiceUrl =
      process.env.APP_INTEGRATION_SERVICE_BASE_URL || 'http://localhost:5001'
    const reposResponse = await axios.get(`${appIntegrationServiceUrl}/api/v1/repos`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    const reposList = reposResponse.data.data || []
    const repoIds = reposList.map((r: any) => r.id)

    const baseWhere: any = {
      repositoryId: { in: repoIds },
    }

    if (onlyResolved) {
      baseWhere.findings = {
        some: {
          status: 'RESOLVED',
        },
      }
    }

    const total = await prisma.scan.count({
      where: baseWhere,
    })

    const scans = await prisma.scan.findMany({
      where: baseWhere,
      include: {
        findings: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
    })

    const reposMap = new Map(reposList.map((r: any) => [r.id, r.repo_name]))
    const formattedScans = scans.map((s) => ({
      ...s,
      repoName: reposMap.get(s.repositoryId) || 'Unknown Repo',
    }))

    return res.status(200).json({
      success: true,
      data: formattedScans,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (err) {
    console.log(err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

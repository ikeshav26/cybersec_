import type { Request, Response } from 'express'
import { prisma } from '../config/db.js'
import axios from 'axios'
import { runBackgroundScan } from '../utils/background-scanner.js'

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
    setImmediate(() => {
      runBackgroundScan(scan.id, repo.repo_url, repo.installationId).catch((err) => {
        console.log(`Background Scan failed for scanId:${scan.id}`, err)
      })
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

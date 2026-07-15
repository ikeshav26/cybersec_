/**
 * Copyright (c) 2026 Keshav Gilhotra. All Rights Reserved.
 * This file is part of a proprietary project. Unauthorized copying is strictly prohibited.
 */

import { Request, Response } from 'express'
import { prisma } from '../config/db.js'
import axios from 'axios'
import jwt from 'jsonwebtoken'

export const githubWebhookController = async (req: Request, res: Response) => {
  try {
    console.log('========== WEBHOOK ==========')
    console.log('Event:', req.headers['x-github-event'])

    const { action, repositories_removed, repository, installation, pull_request } =
      req.body

    const event = req.headers['x-github-event']

    if (event === 'installation' && (action === 'deleted' || action === 'suspend')) {
      if (installation && installation.id) {
        const dbInstallation = await prisma.installation.findUnique({
          where: {
            installationId: String(installation.id),
          },
          include: {
            repositories: true,
          },
        })

        if (dbInstallation) {
          for (const repo of dbInstallation.repositories) {
            try {
              const token = jwt.sign(
                { id: dbInstallation.userId },
                process.env.JWT_SECRET as string,
              )

              await axios.delete(
                `${process.env.SECURE_BOT_SERVICE_URL}/api/secure-bot/scan/delete/data/${repo.id}`,
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                },
              )
            } catch (err) {
              console.error(`Failed to delete secure-bot history for repo ${repo.repo_name}:`, err)
            }
          }

          // Update User table in auth schema to set installationID to NULL
          try {
            await prisma.$executeRawUnsafe(
              `UPDATE "auth"."User" SET "installationID" = NULL WHERE "id" = $1`,
              dbInstallation.userId,
            )
          } catch (dbErr) {
            console.error('Failed to update User installationID in auth schema:', dbErr)
          }

          await prisma.repository.deleteMany({
            where: {
              installationId: dbInstallation.id,
            },
          })

          await prisma.installation.delete({
            where: {
              id: dbInstallation.id,
            },
          })
        }
      }
    }

    if (action === 'removed') {
      for (const repo of repositories_removed) {
        const repository = await prisma.repository.findFirst({
          where: {
            repo_name: repo.full_name,
          },
          include: {
            installation: true,
          },
        })

        if (!repository) continue

        const token = jwt.sign(
          { id: repository.installation.userId },
          process.env.JWT_SECRET as string,
        )

        await axios.delete(
          `${process.env.SECURE_BOT_SERVICE_URL}/api/secure-bot/scan/delete/data/${repository.id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        )

        await prisma.repository.delete({
          where: {
            id: repository.id,
          },
        })
      }
    }

    if (action === 'opened' || action === 'reopened' || action === 'synchronize') {
      console.log('Pr open event received..')
      const repoName = repository.full_name
      const prNumber = pull_request.number

      const repo = await prisma.repository.findFirst({
        where: {
          repo_name: repoName,
          installation: {
            installationId: String(installation.id),
          },
        },
      })

      if (!repo) {
        return res.status(400).json({ message: 'Repository does not exist!' })
      }

      if (!repo.prReviewer) {
        return res
          .status(200)
          .json({ message: 'Auto Pull-Request reviewer is disabled!' })
      }

      const token = jwt.sign({ id: installation.id }, process.env.JWT_SECRET as string)

      console.log('Sending pr review request to secure-bot service....')
      await axios.post(
        `${process.env.SECURE_BOT_SERVICE_URL}/api/secure-bot/review/pr`,
        {
          installationId: installation.id,
          repoName,
          prNumber,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )
    }

    return res.sendStatus(200)
  } catch (err) {
    console.log(err)
    res.status(500).json({ message: 'Internal Server Error' })
  }
}

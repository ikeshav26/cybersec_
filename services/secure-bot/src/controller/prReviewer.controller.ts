import { Request, Response } from 'express'
import { App } from 'octokit'
import { getPrReviewsByDiffs } from '../config/ai.js'

const githubApp = new App({
  appId: process.env.GITHUB_APP_ID as string,
  privateKey: process.env.GITHUB_PRIVATE_KEY as string,
})
export const reviewPr = async (req: Request, res: Response) => {
  try {
    console.log('Received PR by secure-bot for review...')
    const { prNumber, repoName, installationId } = req.body
    if (!prNumber || !repoName || !installationId) {
      return res.status(400).json({ message: 'Pr number and repo name is required' })
    }

    const octokit = await githubApp.getInstallationOctokit(installationId)
    const [owner, repo] = repoName.split('/')

    console.log('PR diffs fetching..')
    const prDiff = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
      mediaType: {
        format: 'diff',
      },
    })

    console.log(prDiff.data)

    const reviews = await getPrReviewsByDiffs(prDiff.data)
    console.log('============= AI PR REVIEW =============')
    console.log(JSON.stringify(reviews, null, 2))

    const commentPrReview = await octokit.rest.pulls.createReview({
      owner,
      repo,
      pull_number: Number(prNumber),
      body: reviews.reviewBody,
      event: 'COMMENT',
    })

    return res
      .status(200)
      .json({ message: 'PR reviewed successfully', reviewBody: reviews.reviewBody })
  } catch (err) {
    console.log(err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

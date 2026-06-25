import { Request, Response } from "express";
import { App, Octokit } from "octokit"


const githubApp = new App({
    appId: process.env.GITHUB_APP_ID as string,
    privateKey: process.env.GITHUB_PRIVATE_KEY as string,
})
export const reviewPr = async (req: Request, res: Response) => {
    try {
        console.log("Received PR by secure-bot for review...")
        const { prNumber, repoName, installationId } = req.body;
        if (!prNumber || !repoName || !installationId) {
            return res.status(400).json({ message: "Pr number and repo name is required" })
        }

        const octokit = await githubApp.getInstallationOctokit(installationId)
        const [owner, repo] = repoName.split("/")

        console.log("PR diffs fetching..")
        const prDiff = await octokit.rest.pulls.get(
            {
                owner,
                repo,
                pull_number: prNumber,
                mediaType: {
                    format: "diff"
                }
            }
        )
        console.log(prDiff.data)
        return res.status(200).json({ message: "Received Diffs for pr" })
    } catch (err) {
        console.log(err)
        return res.status(500).json({ message: "Internal server error" })
    }
}
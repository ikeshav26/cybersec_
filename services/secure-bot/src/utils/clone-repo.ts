import { asyncExec } from './exec.js'
import { App } from 'octokit'

const githubApp = process.env.GITHUB_APP_ID && process.env.GITHUB_PRIVATE_KEY
  ? new App({
      appId: process.env.GITHUB_APP_ID,
      privateKey: process.env.GITHUB_PRIVATE_KEY.replace(/\\n/g, '\n'),
    })
  : null

export const cloneRepo = async (repoUrl: string, clonePath: string, installationId?: string | number) => {
  try {
    let authenticatedUrl = repoUrl
    if (installationId && githubApp) {
      try {
        const octokit = await githubApp.getInstallationOctokit(Number(installationId))
        const auth: any = await octokit.auth({ type: 'installation' })
        const token = auth.token
        if (token) {
          authenticatedUrl = repoUrl.replace('https://github.com/', `https://x-access-token:${token}@github.com/`)
        }
      } catch (authErr) {
        console.error('Failed to get installation access token for cloning:', authErr)
      }
    }

    console.log(`Cloning repository ${repoUrl} to ${clonePath}...`)
    const { stdout } = await asyncExec(`git clone --depth 1 ${authenticatedUrl} ${clonePath}`)
    console.log(`Repository cloned successfully!`)
    return stdout
  } catch (err: any) {
    console.log('Failed to clone repository', err)
    throw err
  }
}

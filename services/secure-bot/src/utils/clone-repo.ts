import { asyncExec } from './exec.js'

export const cloneRepo = async (repoUrl: string, clonePath: string) => {
  try {
    console.log(`Cloning repository ${repoUrl} to ${clonePath}...`)
    const { stdout } = await asyncExec(`git clone ${repoUrl} ${clonePath}`)
    console.log(`Repository cloned successfully!`)
    return stdout
  } catch (err: any) {
    console.log('Failed to clone repository', err)
    throw err
  }
}

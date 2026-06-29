import fs from 'fs'
import path from 'path'

export const startFixCleanupJob = () => {
  console.log('[Cleanup] Starting staged fixes cache cleanup worker...')
  
  // Run every 10 minutes
  setInterval(async () => {
    const fixesDir = path.join(process.cwd(), 'fixes')
    if (!fs.existsSync(fixesDir)) return

    try {
      const folders = await fs.promises.readdir(fixesDir)
      const now = Date.now()
      const maxAge = 30 * 60 * 1000 // 30 minutes

      for (const folder of folders) {
        const folderPath = path.join(fixesDir, folder)
        const stats = await fs.promises.stat(folderPath)
        
        // Check both creation time and modification time
        const age = now - Math.max(stats.mtimeMs, stats.birthtimeMs)
        
        if (age > maxAge) {
          await fs.promises.rm(folderPath, { recursive: true, force: true })
          console.log(`[Cleanup] Deleted stale cache folder: ${folder} (Age: ${Math.round(age / 1000 / 60)} mins)`)
        }
      }
    } catch (err) {
      console.error('[Cleanup] Error running fixes cache cleanup:', err)
    }
  }, 10 * 60 * 1000)
}

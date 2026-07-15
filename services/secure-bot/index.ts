/**
 * Copyright (c) 2026 Keshav Gilhotra. All Rights Reserved.
 * This file is part of a proprietary project. Unauthorized copying is strictly prohibited.
 */

import 'dotenv/config'
import app from './src/app.js'
import './src/workers/scan.worker.js'
import { startFixCleanupJob } from './src/utils/cleanup-fixes.js'

const PORT = process.env.PORT || 5002

app.listen(PORT, () => {
  console.log(`Secure bot running on ${PORT}`)
  startFixCleanupJob()
})

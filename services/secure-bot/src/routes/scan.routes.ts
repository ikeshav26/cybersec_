/**
 * Copyright (c) 2026 Keshav Gilhotra. All Rights Reserved.
 * This file is part of a proprietary project. Unauthorized copying is strictly prohibited.
 */

import express from 'express'
import {
  getScanStatus,
  removeRepoScanAndFindings,
  scanRepo,
  getScanHistory,
} from '../controller/scan.controller.js'
import { userAuth } from '../middlewares/auth.middleware.js'

const router: express.Router = express.Router()

router.post('/repo/:id', userAuth, scanRepo)
router.get('/history', userAuth, getScanHistory)
router.get('/status/:scanId', userAuth, getScanStatus)
router.delete('/delete/data/:repoId', userAuth, removeRepoScanAndFindings)

export default router

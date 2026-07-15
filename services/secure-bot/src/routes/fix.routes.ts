/**
 * Copyright (c) 2026 Keshav Gilhotra. All Rights Reserved.
 * This file is part of a proprietary project. Unauthorized copying is strictly prohibited.
 */

import { fixFinding, fixAllFindings } from '../controller/fix.controller.js'
import { userAuth } from '../middlewares/auth.middleware.js'
import express from 'express'

const router: express.Router = express.Router()

router.post('/finding/:findingId', userAuth, fixFinding)
router.post('/findings', userAuth, fixAllFindings)

export default router

/**
 * Copyright (c) 2026 Keshav Gilhotra. All Rights Reserved.
 * This file is part of a proprietary project. Unauthorized copying is strictly prohibited.
 */

import express from 'express'
import { userAuth } from '../middlewares/auth.middleware.js'
import { changePrReviewerStatus } from '../controller/autoPr.controller.js'

const router: express.Router = express.Router()

router.get('/update-status/:repoId', userAuth, changePrReviewerStatus)

export default router

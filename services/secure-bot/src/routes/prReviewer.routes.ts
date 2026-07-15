/**
 * Copyright (c) 2026 Keshav Gilhotra. All Rights Reserved.
 * This file is part of a proprietary project. Unauthorized copying is strictly prohibited.
 */

import express from 'express'
import { userAuth } from '../middlewares/auth.middleware.js'
import { reviewPr } from '../controller/prReviewer.controller.js'

const router = express.Router()

router.post('/pr', userAuth, reviewPr)

export default router

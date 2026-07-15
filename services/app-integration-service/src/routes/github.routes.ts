/**
 * Copyright (c) 2026 Keshav Gilhotra. All Rights Reserved.
 * This file is part of a proprietary project. Unauthorized copying is strictly prohibited.
 */

import express from 'express'
import { githubWebhookController } from '../controller/github.controller.js'

const router = express.Router()

router.post('/webhook', githubWebhookController)

export default router

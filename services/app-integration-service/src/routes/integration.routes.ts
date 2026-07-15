/**
 * Copyright (c) 2026 Keshav Gilhotra. All Rights Reserved.
 * This file is part of a proprietary project. Unauthorized copying is strictly prohibited.
 */

import express from 'express'
import { userAuth } from '../middlewares/auth.middleware.js'
import {
  createInstallation,
  getRepository,
  getUserRepositories,
  syncRepos,
} from '../controller/integration.controller.js'

const router = express.Router()

router.post('/install/app', userAuth, createInstallation)
router.post('/sync/repos', userAuth, syncRepos)
router.get('/repos', userAuth, getUserRepositories)
router.get('/repos/:repoId', userAuth, getRepository)

export default router

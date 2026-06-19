import express from 'express'
import { userAuth } from '../middlewares/auth.middleware.js'
import {
  createInstallation,
  getRepository,
  syncRepos,
} from '../controller/integration.controller.js'

const router = express.Router()

router.post('/install/app', userAuth, createInstallation)
router.post('/sync/repos', userAuth, syncRepos)
router.get('/repos/:repoId', userAuth, getRepository)

export default router

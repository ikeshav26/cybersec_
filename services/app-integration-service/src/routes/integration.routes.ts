import express, { Request, Response } from 'express'
import { userAuth } from '../middlewares/auth.middleware.js'
import { createInstallation, syncRepos } from '../controller/integration.controller.js'

const router = express.Router()

router.post('/install/app', userAuth, createInstallation)
router.post('/sync/repos', userAuth, syncRepos)

export default router

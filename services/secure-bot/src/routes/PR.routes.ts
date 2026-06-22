import express from 'express'
import { userAuth } from '../middlewares/auth.middleware.js'
import { openPullRequestForFix } from '../controller/PR.controller.js'

const router: express.Router = express.Router()

router.post('/open-pr/:scanId', userAuth, openPullRequestForFix)

export default router

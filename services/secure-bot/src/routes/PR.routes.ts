import express from 'express'
import { userAuth } from '../middlewares/auth.middleware.js'
import { openPullRequestForFix, getPullRequestUrl } from '../controller/PR.controller.js'

const router: express.Router = express.Router()

router.post('/open-pr/:scanId', userAuth, openPullRequestForFix)
router.get('/pr-url/:scanId', userAuth, getPullRequestUrl)

export default router

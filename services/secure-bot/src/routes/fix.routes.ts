import { fixFinding, fixAllFindings, openPullRequestForFix } from "../controller/fix.controller.js";
import { userAuth } from "../middlewares/auth.middleware.js"
import express from 'express'


const router: express.Router = express.Router()


router.post('/finding/:findingId', userAuth, fixFinding)
router.post('/findings', userAuth, fixAllFindings)
router.post('/open-pr/:scanId', userAuth, openPullRequestForFix)

export default router;
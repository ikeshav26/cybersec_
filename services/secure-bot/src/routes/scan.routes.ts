import express from 'express'
import { getScanStatus, scanRepo } from '../controller/scan.controller.js'
import { userAuth } from '../middlewares/auth.middleware.js'

const router: express.Router = express.Router()

router.post('/repo/:id', userAuth, scanRepo)
router.get('/status/:scanId', userAuth, getScanStatus)

export default router

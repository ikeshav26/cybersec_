import express from 'express'
import { userAuth } from '../middlewares/auth.middleware.js'
import { reviewPr } from '../controller/prReviewer.controller.js'

const router = express.Router()

router.post('/pr', userAuth, reviewPr)

export default router

import express from 'express'
import { githubWebhookController } from '../controller/github.controller.js'

const router = express.Router()


router.post('/webhook', githubWebhookController)



export default router;
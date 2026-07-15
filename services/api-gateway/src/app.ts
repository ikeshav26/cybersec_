/**
 * Copyright (c) 2026 Keshav Gilhotra. All Rights Reserved.
 * This file is part of a proprietary project. Unauthorized copying is strictly prohibited.
 */

import express, { Request, Response } from 'express'
import { authProxy } from './routes/auth.route.js'
import { appIntegrationProxy } from './routes/app-integration.routes.js'
import { Authenticate } from './middlewares/auth.middleware.js'
import { secureBotProxy } from './routes/secure-bot.routes.js'
import { fixLimiter, scanLimiter } from './middlewares/rate-limit-middleware.js'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import { errorHandler } from './middlewares/error-handler.middleware.js'
import helmet from 'helmet'

const app: express.Application = express()
app.use(
  cors({
    origin: [process.env.CLIENT_URL || 'http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  }),
)
app.use(express.json())
app.use(cookieParser())
app.use(helmet())

app.get('/api/health', (req: Request, res: Response) => {
  return res.status(200).json({ message: 'API Gateway is healthy ' })
})
app.get('/api', (req: Request, res: Response) => {
  return res.status(200).json({ message: 'API Gateway is healthy /api route' })
})
app.get('/', (req: Request, res: Response) => {
  return res.status(200).json({ message: 'API Gateway is healthy / route' })
})
app.use('/api/auth', authProxy)
app.use('/api/app-integration', appIntegrationProxy)
app.use('/api/secure-bot', secureBotProxy)
app.use('/api/secure-bot/scan', scanLimiter, secureBotProxy)
app.use('/api/secure-bot/fix', fixLimiter, secureBotProxy)

app.use(errorHandler)
export default app

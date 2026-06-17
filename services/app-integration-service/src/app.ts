import cookieParser from 'cookie-parser'
import 'dotenv/config'
import express from 'express'
import type { Application, Request, Response } from 'express'
import integrationRoutes from './routes/integration.routes.js'
import cors from 'cors'

const app: Application = express()

app.use(
    cors({
        origin: process.env.CLIENT_URL || "http://localhost:3000",
        credentials: true
    })
)
app.use(express.json())
app.use(cookieParser())

app.get('/', (req: Request, res: Response) => {
    res.status(200).json({ message: 'hello from app integration service' })
})

app.use('/api/v1', integrationRoutes)

export default app

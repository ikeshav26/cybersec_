import express from 'express'
import dotenv from 'dotenv'
import cookieParser from 'cookie-parser'
import scanRoutes from './routes/scan.routes.js'
import cors from 'cors'
import { connectRedis } from './config/redis.js'

dotenv.config()

const app: express.Express = express()

connectRedis();

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
  }),
)

app.use(express.json())
app.use(cookieParser())

app.get('/', (req, res) => {
  res.status(200).json({ message: 'hello from secure bot service' })
})

app.use('/api/secure-bot/scan', scanRoutes)

export default app

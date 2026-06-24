import express from 'express'
import dotenv from 'dotenv'
import authRoutes from './routes/auth.routes.js'
import cookieParser from 'cookie-parser'
import cors from 'cors'

dotenv.config()

const app = express()

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
  }),
)
app.use(express.json())
app.use(cookieParser())

app.get('/', (req, res) => {
  res.status(200).json({ message: 'hello from auth service' })
})

app.get('/health', (req, res) => {
  res.status(200).json({ message: 'Auth Service is healthy' })
})


app.use('/api/auth', authRoutes)

export default app

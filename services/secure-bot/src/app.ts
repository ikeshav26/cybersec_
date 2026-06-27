import express from 'express'
import dotenv from 'dotenv'
import cookieParser from 'cookie-parser'
import scanRoutes from './routes/scan.routes.js'
import fixRoutes from './routes/fix.routes.js'
import reviewerRoutes from './routes/prReviewer.routes.js'
import prRoutes from './routes/PR.routes.js'
import cors from 'cors'

dotenv.config()

const app: express.Express = express()

app.use(
  cors({
    origin: [process.env.CLIENT_URL || 'http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
  }),
)

app.use(express.json())
app.use(cookieParser())

app.get('/', (req, res) => {
  res.status(200).json({ message: 'hello from secure bot service' })
})

app.use('/api/secure-bot/scan', scanRoutes)
app.use('/api/secure-bot/fix', fixRoutes)
app.use('/api/secure-bot/pr', prRoutes)
app.use('/api/secure-bot/review', reviewerRoutes)

export default app

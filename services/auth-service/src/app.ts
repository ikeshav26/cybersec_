import express from 'express'
import dotenv from 'dotenv'
import authRoutes from './routes/auth.routes.js'

dotenv.config()


const app = express()
app.use(express.json())

app.get('/', (req, res) => {
  res.status(200).json({ message: 'hello from auth service' })
})

app.use('/api/auth', authRoutes)

export default app

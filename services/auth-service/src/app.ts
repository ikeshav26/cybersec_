import express from 'express'
import dotenv from 'dotenv'

dotenv.config()

const app = express()

app.get('/', (req, res) => {
  res.status(200).json({ message: 'hello from auth service' })
})

export default app

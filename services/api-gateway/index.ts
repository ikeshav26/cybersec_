import 'dotenv/config'
import app from './src/app.js'
import { EventEmitter } from 'events'

EventEmitter.defaultMaxListeners = 30

const PORT = process.env.PORT || 5003

app.listen(PORT, () => {
  console.log(`API-gateway is running on port ${PORT}`)
})

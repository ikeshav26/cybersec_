import 'dotenv/config'
import app from './src/app.js'
import './src/workers/scan.worker.js'

const PORT = process.env.PORT || 5002

app.listen(PORT, () => {
  console.log(`Secure bot running on ${PORT}`)
})

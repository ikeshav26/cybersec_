import 'dotenv/config'
import app from './src/app.js'
import { keepAwake } from '@ikeshav26/keep-awake'

const PORT = process.env.PORT || 5001

app.listen(PORT, () => {
  console.log(`App-Integration-Service running on ${PORT}`)

  keepAwake({
    url: process.env.SYNC_REPOS_URL!,
    interval: 24 * 60 //one day
  });
})

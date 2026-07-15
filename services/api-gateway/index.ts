/**
 * Copyright (c) 2026 Keshav Gilhotra. All Rights Reserved.
 * This file is part of a proprietary project. Unauthorized copying is strictly prohibited.
 */

import 'dotenv/config'
import app from './src/app.js'
import { EventEmitter } from 'events'

EventEmitter.defaultMaxListeners = 30

const PORT = process.env.PORT || 5003

app.listen(PORT, () => {
  console.log(`API-gateway is running on port ${PORT}`)
})

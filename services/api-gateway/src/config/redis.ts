/**
 * Copyright (c) 2026 Keshav Gilhotra. All Rights Reserved.
 * This file is part of a proprietary project. Unauthorized copying is strictly prohibited.
 */

import { Redis } from 'ioredis'

export const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

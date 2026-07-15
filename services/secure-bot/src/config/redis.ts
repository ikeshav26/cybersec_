/**
 * Copyright (c) 2026 Keshav Gilhotra. All Rights Reserved.
 * This file is part of a proprietary project. Unauthorized copying is strictly prohibited.
 */

import type { ConnectionOptions } from 'bullmq'

export const redisConnectionOptions: ConnectionOptions = {
  url: process.env.REDIS_URL!,
  maxRetriesPerRequest: null,
}

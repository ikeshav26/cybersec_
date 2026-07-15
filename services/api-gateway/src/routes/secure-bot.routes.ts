/**
 * Copyright (c) 2026 Keshav Gilhotra. All Rights Reserved.
 * This file is part of a proprietary project. Unauthorized copying is strictly prohibited.
 */

import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware'

export const secureBotProxy = createProxyMiddleware({
  target: process.env.SECURE_BOT_SERVICE_URL,
  changeOrigin: true,
  proxyTimeout: 120000,
  timeout: 120000,
  on: {
    proxyReq: fixRequestBody,
  },
})

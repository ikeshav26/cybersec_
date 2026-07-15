/**
 * Copyright (c) 2026 Keshav Gilhotra. All Rights Reserved.
 * This file is part of a proprietary project. Unauthorized copying is strictly prohibited.
 */

import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware'

export const authProxy = createProxyMiddleware({
  target: process.env.AUTH_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/': '/api/auth/',
  },
  proxyTimeout: 10000,
  timeout: 10000,
  on: {
    proxyReq: fixRequestBody,
  },
})

/**
 * Copyright (c) 2026 Keshav Gilhotra. All Rights Reserved.
 * This file is part of a proprietary project. Unauthorized copying is strictly prohibited.
 */

import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware'

export const appIntegrationProxy = createProxyMiddleware({
  target: process.env.APP_INTEGRATION_SERVICE_URL,
  changeOrigin: true,
  proxyTimeout: 10000,
  timeout: 10000,
  on: {
    proxyReq: fixRequestBody,
  },
})

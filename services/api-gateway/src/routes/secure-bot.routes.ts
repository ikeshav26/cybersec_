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

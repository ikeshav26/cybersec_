import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware'

export const secureBotProxy = createProxyMiddleware({
  target: process.env.SECURE_BOT_SERVICE_URL,
  changeOrigin: true,
  proxyTimeout: 10000,
  timeout: 10000,
  on: {
    proxyReq: fixRequestBody,
  },
})

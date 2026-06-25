import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware'

export const authProxy = createProxyMiddleware({
  target: process.env.AUTH_SERVICE_URL,
  changeOrigin: true,
  proxyTimeout: 10000,
  timeout: 10000,
  on: {
    proxyReq: fixRequestBody,
  },
})

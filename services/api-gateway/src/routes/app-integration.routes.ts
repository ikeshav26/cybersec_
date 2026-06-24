import { createProxyMiddleware, fixRequestBody } from "http-proxy-middleware";


export const appIntegrationProxy = createProxyMiddleware({
    target: process.env.APP_INTEGRATION_SERVICE_URL,
    changeOrigin: true,
    proxyTimeout: 10000,
    timeout: 10000, 
    on: {
        proxyReq: fixRequestBody
    }
})
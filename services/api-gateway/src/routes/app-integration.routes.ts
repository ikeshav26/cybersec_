import { createProxyMiddleware } from "http-proxy-middleware";


export const appIntegrationProxy = createProxyMiddleware({
    target: process.env.APP_INTEGRATION_SERVICE_URL,
    changeOrigin: true
})
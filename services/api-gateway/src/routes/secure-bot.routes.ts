import { createProxyMiddleware } from "http-proxy-middleware";

export const secureBotProxy = createProxyMiddleware({
    target: process.env.SECURE_BOT_SERVICE_URL,
    changeOrigin: true
})
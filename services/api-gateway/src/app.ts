import express, { Request, Response } from 'express'
import { authProxy } from './routes/auth.route.js';
import { appIntegrationProxy } from './routes/app-integration.routes.js';
import { Authenticate } from './middlewares/auth.middleware.js';
import { secureBotProxy } from './routes/secure-bot.routes.js';
import { fixLimiter, scanLimiter } from './middlewares/rate-limit-middleware.js';

const app: express.Application = express();
app.use(express.json())

app.get('/api/health', (req: Request, res: Response) => {
    return res.status(200).json({ message: "API Gateway is healthy" })
})
app.use('/api/auth', authProxy)
app.use('/api/app-integration', Authenticate, appIntegrationProxy)
app.use('/api/secure-bot', Authenticate, secureBotProxy)
app.use('/api/secure-bot/scan', Authenticate, scanLimiter, secureBotProxy)
app.use('/api/secure-bot/fix', Authenticate, fixLimiter, secureBotProxy)

export default app;
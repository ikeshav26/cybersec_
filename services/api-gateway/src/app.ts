import express, { Request, Response } from 'express'
import { authProxy } from './routes/auth.route.js';
import { appIntegrationProxy } from './routes/app-integration.routes.js';
import { Authenticate } from './middlewares/auth.middleware.js';
import { secureBotProxy } from './routes/secure-bot.routes.js';
import { fixLimiter, scanLimiter } from './middlewares/rate-limit-middleware.js';
import cookieParser from 'cookie-parser'
import cors from 'cors'
import { errorHandler } from './middlewares/error-handler.middleware.js';
import helmet from 'helmet';

const app: express.Application = express();
app.use(cors({
    origin: "http://localhost:3000",
    credentials: true
}))
app.use(express.json())
app.use(cookieParser())
app.use(helmet())

app.get('/api/health', scanLimiter, (req: Request, res: Response) => {
    return res.status(200).json({ message: "API Gateway is healthy" })
})
app.use('/api/auth', authProxy)
app.use('/api/app-integration', Authenticate, appIntegrationProxy)
app.use('/api/secure-bot', Authenticate, secureBotProxy)
app.use('/api/secure-bot/scan', Authenticate, scanLimiter, secureBotProxy)
app.use('/api/secure-bot/fix', Authenticate, fixLimiter, secureBotProxy)

app.use(errorHandler)
export default app;
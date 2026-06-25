import rateLimit from 'express-rate-limit'
import RedisStore, { RedisReply } from 'rate-limit-redis'
import { redisClient } from '../config/redis.js'

export const scanLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Too many scan requests. Please wait a minute and try again.' },
  store: new RedisStore({
    sendCommand: async (...args: string[]) => {
      return redisClient.call(args[0], ...args.slice(1)) as Promise<RedisReply>
    },
  }),
})

export const fixLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  message: { error: 'Too many fix requests. Please wait a minute and try again.' },
  store: new RedisStore({
    sendCommand: async (...args: string[]) => {
      return redisClient.call(args[0], ...args.slice(1)) as Promise<RedisReply>
    },
  }),
})

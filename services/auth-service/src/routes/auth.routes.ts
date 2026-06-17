import express from 'express'
import passport from '../config/passport.js'
import { authController } from '../controller/auth.controller.js'

const router = express.Router()

router.get(
  '/github',
  passport.authenticate('github', {
    scope: ['user:email'],
    session: false,
  }),
)

router.get('/github/callback', authController)

export default router

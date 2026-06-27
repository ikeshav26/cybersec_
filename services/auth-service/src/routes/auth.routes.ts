import express from 'express'
import passport from '../config/passport.js'
import { authController, getLoginedUser, logoutUser } from '../controller/auth.controller.js'
import { userAuth } from '../middlewares/auth.middleware.js'

const router = express.Router()

router.get(
  '/github',
  passport.authenticate('github', {
    scope: ['user:email'],
    session: false,
  }),
)

router.get('/github/callback', authController)
router.get('/me', userAuth, getLoginedUser)
router.get('/logout', userAuth, logoutUser)

export default router

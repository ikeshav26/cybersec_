/**
 * Copyright (c) 2026 Keshav Gilhotra. All Rights Reserved.
 * This file is part of a proprietary project. Unauthorized copying is strictly prohibited.
 */

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

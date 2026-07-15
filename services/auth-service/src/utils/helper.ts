/**
 * Copyright (c) 2026 Keshav Gilhotra. All Rights Reserved.
 * This file is part of a proprietary project. Unauthorized copying is strictly prohibited.
 */

import { Response } from 'express'
import jwt from 'jsonwebtoken'

export const clearCookies = (res: Response) => {
  res.clearCookie('token')
}

export const generateToken = (id: string) => {
  try {
    return jwt.sign({ id }, process.env.JWT_SECRET!, {
      expiresIn: '7d',
    })
  } catch (err) {
    console.log(err)
    return null
  }
}

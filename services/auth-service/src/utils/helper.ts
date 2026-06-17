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

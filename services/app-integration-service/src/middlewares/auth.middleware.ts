import { NextFunction, Request, Response } from 'express'
import { JwtPayload } from 'jsonwebtoken'
import jwt from 'jsonwebtoken'

export const userAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1]
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload
    ;(req as any).user = decoded
    next()
  } catch (err) {
    console.log(err)
    return res.status(401).json({ message: 'Unauthorized' })
  }
}

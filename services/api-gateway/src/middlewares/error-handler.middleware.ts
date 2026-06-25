import { NextFunction, Request, Response } from 'express'

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  console.error(err)
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' })
}

/**
 * Copyright (c) 2026 Keshav Gilhotra. All Rights Reserved.
 * This file is part of a proprietary project. Unauthorized copying is strictly prohibited.
 */

import type { NextFunction, Request, Response } from 'express'
import jwt, { type JwtPayload } from 'jsonwebtoken'

export const userAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = req.cookies.token || req.headers.authorization?.split(' ')[1]
        if (!token) {
            return res.status(401).json({ message: 'Unauthorized' })
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload
            ; (req as any).user = decoded
        next()
    } catch (err) {
        console.log(err)
        return res.status(401).json({ message: 'Unauthorized' })
    }
}

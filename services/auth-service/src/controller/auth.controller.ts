import { generateToken } from '../utils/helper.js'
import passport from '../config/passport.js'
import { Request, Response, NextFunction } from 'express'
import { prisma } from '../config/db.js'

interface User {
  id: string
  githubId: string
  email: string
  username: string
  name: string
  avatar: string
  installationID: string
}

export const authController = (req: Request, res: Response, next: NextFunction) => {
  try {
    passport.authenticate(
      'github',
      { session: false },
      (err: Error | null, user: User | null) => {
        if (err) {
          console.error('github OAuth error', err)
          return res.redirect(
            `${process.env.CLIENT_URL}/login?error=oauth_failed&message="Authentication failed"`,
          )
        }

        if (!user) {
          return res.redirect(
            `${process.env.CLIENT_URL}/login?error=oauth_failed&message="No user found"`,
          )
        }

        const token: string | null = generateToken(user.id)

        res.redirect(
          `${process.env.CLIENT_URL}/dashboard/?oauth=success&token=${encodeURIComponent(token ? token : '')}&user=${encodeURIComponent(JSON.stringify({ userId: user.id, username: user.username, email: user.email, avatar: user.avatar, installationID: user.installationID }))}`,
        )
      },
    )(req, res, next)
  } catch (err) {
    console.error('OAuth Controller error', err)
    return res.redirect(
      `${process.env.CLIENT_URL}/login?error=oauth_failed&message="Internal server error"`,
    )
  }
}


export const getLoginedUser = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id || (req.user as any)?.userId;
    if (!userId) {
      return res.status(400).json({ message: "No user found" })
    }
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        avatar: true,
        installationID: true,
      }
    })
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }
    return res.status(200).json({ message: "User found", user })
  } catch (err) {
    console.log(err)
    return res.status(500).json({ message: "Internal server error" })
  }
}


export const logoutUser = async (req: Request, res: Response) => {
  try {
    res.clearCookie("token")
    return res.status(200).json({ message: "Logout successful" })
  } catch (err) {
    console.log(err)
    return res.status(500).json({ message: "Internal server error" })
  }
}
import { Strategy as GitHubStrategy } from 'passport-github2'
import passport from 'passport'
import dotenv from 'dotenv'
import { Request } from 'express'
import { prisma } from './db.js'

dotenv.config()

passport.use(
    new GitHubStrategy(
        {
            clientID: process.env.GITHUB_CLIENT_ID || '',
            clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
            callbackURL: `${process.env.API_URL || 'http://localhost:5000/api'}/auth/github/callback`,
            scope: ['user:email'],
            passReqToCallback: true
        },
        async (
            req: Request,
            accessToken: string,
            refreshToken: string,
            profile: any,
            done: (err: any, user?: any) => void,
        ) => {
            try {
                const email = profile.emails?.[0]?.value
                const avatarUrl = profile.photos?.[0]?.value

                const installation_id = req?.query?.installation_id as string;

                if (!email) {
                    return done(new Error('No email provided by GitHub'), null)
                }

                // 1. Check if user already exists with this githubId
                let user = await prisma.user.findUnique({
                    where: { githubId: String(profile.id) },
                })


                // if user logging after app installation, update their installation id
                if (installation_id && user) {
                    const updatedUser = await prisma.user.update({
                        where: { email: email },
                        data: {
                            installationID: installation_id
                        }
                    })
                    user.installationID = updatedUser.installationID
                }

                // 2. If not, register them
                if (!user) {
                    user = await prisma.user.create({
                        data: {
                            githubId: String(profile.id),
                            email: email,
                            username: profile.username || `user_${profile.id}`,
                            name: profile.displayName || profile.username,
                            avatar: avatarUrl,
                            installationID: installation_id || null
                        },
                    })
                }

                return done(null, user)
            } catch (err) {
                return done(err, null)
            }
        },
    ),
)

export default passport

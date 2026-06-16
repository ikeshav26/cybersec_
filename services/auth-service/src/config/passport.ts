import { Strategy as GitHubStrategy } from 'passport-github2'
import passport from 'passport'
import dotenv from 'dotenv'
import { prisma } from './db.js'

dotenv.config()

passport.use(
    new GitHubStrategy(
        {
            clientID: process.env.GITHUB_CLIENT_ID || '',
            clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
            callbackURL: `${process.env.API_URL || 'http://localhost:5000/api'}/auth/github/callback`,
            scope: ['user:email'],
        },
        async (
            accessToken: string,
            refreshToken: string,
            profile: any,
            done: (err: any, user?: any) => void,
        ) => {
            try {
                const email = profile.emails?.[0]?.value
                const avatarUrl = profile.photos?.[0]?.value

                if (!email) {
                    return done(new Error('No email provided by GitHub'), null)
                }

                // 1. Check if user already exists with this githubId
                let user = await prisma.user.findUnique({
                    where: { githubId: String(profile.id) },
                })

                // 2. If not, register them
                if (!user) {
                    user = await prisma.user.create({
                        data: {
                            githubId: String(profile.id),
                            email: email,
                            username: profile.username || `user_${profile.id}`,
                            name: profile.displayName || profile.username,
                            avatar: avatarUrl,
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

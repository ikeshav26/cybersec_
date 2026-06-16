import { generateToken } from '../utils/helper.js';
import passport from '../config/passport.js';
import { Request, Response, NextFunction } from 'express';

interface User {
    id: string,
    githubId: string,
    email: string,
    username: string,
    name: string,
    avatar: string,
}

export const authController = (req: Request, res: Response, next: NextFunction) => {
    try {
        passport.authenticate('github', { session: false }, (err: Error | null, user: User | null) => {
            if (err) {
                console.error('github OAuth error', err);
                return res.redirect(
                    `${process.env.CLIENT_URL}/login?error=oauth_failed&message="Authentication failed"`
                );
            }

            if (!user) {
                return res.redirect(
                    `${process.env.CLIENT_URL}/login?error=oauth_failed&message="No user found"`
                );
            }

            const token: string | null = generateToken(user.id);

            res.redirect(
                `${process.env.CLIENT_URL}/?oauth=success&token=${encodeURIComponent(token ? token : "")}&user=${encodeURIComponent(JSON.stringify({ userId: user.id, username: user.username, email: user.email, avatar: user.avatar }))}`
            );
        })(req, res, next);
    } catch (err) {
        console.error('OAuth Controller error', err);
        return res.redirect(
            `${process.env.CLIENT_URL}/login?error=oauth_failed&message="Internal server error"`
        );
    }
};
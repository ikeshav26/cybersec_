import rateLimit from "express-rate-limit";

export const scanLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
});

export const fixLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 3,
});
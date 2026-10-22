import { EApplicationEnvironment } from '../constant/application.js'
import config from '../config/config.js'
import * as rateLimiters from '../config/rateLimiter.js'
import httpError from '../util/httpError.js'
import quiker from '../util/quiker.js'
import responseMessage from '../constant/responseMessage.js'
import systemLogService from '../service/systemLogService.js'

const byIp = (req) => `ip:${req.ip}`

// Logged-in traffic is counted per user: shop staff share one WiFi IP.
// Only the signature is checked here (no DB); authentication still runs later.
export const byUserOrIp = (req) => {
    const token = req.cookies?.accessToken
    if (token) {
        try {
            const { userId } = quiker.verifyToken(token, config.ACCESS_TOKEN.SECRET)
            if (userId) return `user:${userId}`
        } catch {
            // invalid or expired token: fall back to the IP
        }
    }
    return byIp(req)
}

const createRateLimit = (getLimiter, keyOf) => (req, res, next) => {
    if (config.ENV === EApplicationEnvironment.DEVELOPMENT) {
        return next()
    }
    const limiter = getLimiter()
    if (!limiter) {
        return next()
    }
    const key = keyOf(req)
    limiter
        .consume(key, 1)
        .then(() => {
            next()
        })
        .catch((rejection) => {
            // One DB row per blocked window, not one per blocked request
            if (rejection?.consumedPoints === limiter.points + 1) {
                void systemLogService.record({ event: 'rate_limited', message: `Too many requests (${limiter.keyPrefix})`, req, meta: { key } })
            }
            httpError(next, new Error(responseMessage.TOO_MANY_REQUEST), req, 429)
        })
}

export const apiRateLimit = createRateLimit(() => rateLimiters.apiRateLimiter, byUserOrIp)
export const authRateLimit = createRateLimit(() => rateLimiters.authRateLimiter, byIp)

export default apiRateLimit

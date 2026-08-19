import { RateLimiterMemory } from 'rate-limiter-flexible'

export let rateLimiter = null

const DURATION = 60
const POINTS = 10

export const initRateLimiter = () => {
    rateLimiter = new RateLimiterMemory({
        points: POINTS,
        duration: DURATION
    })
}

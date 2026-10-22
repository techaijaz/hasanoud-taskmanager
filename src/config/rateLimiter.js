import { RateLimiterMemory } from 'rate-limiter-flexible'

// General API traffic, counted per logged-in user (per IP before login).
// The client polls notifications every 30s, so this limit must stay generous.
export let apiRateLimiter = null
const API_POINTS = 300
const API_DURATION = 60

// Credential endpoints (login, password reset): strict to slow brute force.
export let authRateLimiter = null
const AUTH_POINTS = 10
const AUTH_DURATION = 60

export const initRateLimiter = () => {
    apiRateLimiter = new RateLimiterMemory({
        keyPrefix: 'api',
        points: API_POINTS,
        duration: API_DURATION
    })
    authRateLimiter = new RateLimiterMemory({
        keyPrefix: 'auth',
        points: AUTH_POINTS,
        duration: AUTH_DURATION
    })
}

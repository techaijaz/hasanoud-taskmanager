import httpResponse from '../util/httpResponse.js'
import responseMessage from '../constant/responseMessage.js'
import httpError from '../util/httpError.js'
import prisma from '../config/prisma.js'

// A dead DB connection can hang for the pool timeout (35s); monitors need an answer fast
const DB_CHECK_TIMEOUT_MS = 3000

export default {
    self: (req, res, next) => {
        try {
            httpResponse(req, res, 200, responseMessage.SUCCESS, null)
        } catch (error) {
            httpError(next, error, req, 500)
        }
    },
    // Public, polled by uptime monitors: says only whether the app can serve requests (DB included)
    health: async (req, res, next) => {
        let timer
        try {
            await Promise.race([
                prisma.$queryRaw`SELECT 1`,
                new Promise((_, reject) => {
                    timer = setTimeout(() => reject(new Error('Database check timed out')), DB_CHECK_TIMEOUT_MS)
                })
            ])
            httpResponse(req, res, 200, responseMessage.SUCCESS, { database: 'ok' })
        } catch (error) {
            httpError(next, new Error(`Database unavailable: ${error.message}`), req, 503)
        } finally {
            clearTimeout(timer)
        }
    }
}

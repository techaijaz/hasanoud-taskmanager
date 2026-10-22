import { randomUUID } from 'crypto'
import logger from '../util/logger.js'
import requestPath from '../util/requestPath.js'

// Health probes run every 30s and would bury real traffic
const QUIET_PATHS = new Set(['/', '/api/v1/', '/api/v1/health'])

export default (req, res, next) => {
    req.id = randomUUID()
    res.setHeader('X-Request-Id', req.id)
    const startedAt = process.hrtime.bigint()

    res.on('finish', () => {
        const path = requestPath(req)
        if (QUIET_PATHS.has(path) && res.statusCode < 400) return
        logger.info('HTTP', {
            meta: {
                requestId: req.id,
                method: req.method,
                path,
                status: res.statusCode,
                ms: Math.round(Number(process.hrtime.bigint() - startedAt) / 1e6),
                userId: req.authenticatedUser?.id || null,
                ip: req.ip
            }
        })
    })
    next()
}

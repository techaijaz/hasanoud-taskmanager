import config from './config/config.js'
import app from './app.js'
import logger from './util/logger.js'
import databaseService from './service/databaseService.js'
import rbacService from './service/rbacService.js'
import { initRateLimiter } from './config/rateLimiter.js'
import * as taskInstanceService from './service/taskInstanceService.js'
import { todayIstYmd } from './util/ist.js'

const NOTIFICATION_SYNC_MS = 2 * 60 * 1000

const syncMissedTasks = async () => {
    try {
        const ymd = todayIstYmd()
        await taskInstanceService.generateRecurringForDate(ymd)
        await taskInstanceService.reconcileDate(ymd)
    } catch (error) {
        logger.error('MISSED_TASK_SYNC', { meta: error })
    }
}

// Startup failures also go to stderr: the file logger is the only transport in production,
// so without this `pm2 logs` shows nothing while the app crash-loops
const reportFatal = (label, error) => {
    // Prisma/mariadb nest the real reason (e.g. ECONNREFUSED, Access denied) a few levels down
    const driverCause = error?.meta?.driverAdapterError?.cause || error?.cause
    const reason = String(driverCause?.cause || driverCause?.message || error?.message || error).trim()
    process.stderr.write(`[${new Date().toISOString()}] ${label}: ${reason}\n`)
}

const server = app.listen(config.PORT, () => {
    logger.info('APPLICATION STARTED', {
        meta: {
            PORT: config.PORT,
            SERVER_URL: config.SERVER_URL
        }
    })
})

server.on('error', (error) => {
    logger.error('SERVER LISTEN ERROR', { meta: error })
    reportFatal('SERVER LISTEN ERROR', error)
    process.exit(1)
})
;(async () => {
    try {
        await databaseService.connect()
        logger.info('DATABASE CONNECTION SUCCESSFUL')

        await rbacService.ensureDefaultRolePermissions()
        logger.info('RBAC DEFAULTS READY')

        initRateLimiter()
        logger.info('RATE LIMITER INITIATE')

        await syncMissedTasks()
        setInterval(syncMissedTasks, NOTIFICATION_SYNC_MS)
        logger.info('MISSED TASK SYNC READY')
    } catch (error) {
        logger.error('APPLICATION START ERROR', { meta: error })
        reportFatal('APPLICATION START ERROR', error)
        server.close(() => {
            process.exit(1)
        })
    }
})()

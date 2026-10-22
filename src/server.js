import config from './config/config.js'
import app from './app.js'
import logger from './util/logger.js'
import databaseService from './service/databaseService.js'
import rbacService from './service/rbacService.js'
import { initRateLimiter } from './config/rateLimiter.js'
import * as taskInstanceService from './service/taskInstanceService.js'
import { todayIstYmd } from './util/ist.js'
import systemLogService from './service/systemLogService.js'

const NOTIFICATION_SYNC_MS = 2 * 60 * 1000
const LOG_PURGE_MS = 6 * 60 * 60 * 1000

const syncMissedTasks = async () => {
    try {
        const ymd = todayIstYmd()
        await taskInstanceService.generateRecurringForDate(ymd)
        await taskInstanceService.reconcileDate(ymd)
    } catch (error) {
        logger.error('MISSED_TASK_SYNC', { meta: error })
        void systemLogService.record({
            level: 'error',
            event: 'job_failed',
            message: `Missed task sync: ${error?.message}`,
            meta: { job: 'missed_task_sync' }
        })
    }
}

const purgeSystemLogs = async () => {
    try {
        await systemLogService.purgeOld()
    } catch (error) {
        logger.error('SYSTEM_LOG_PURGE', { meta: error })
        void systemLogService.record({
            level: 'error',
            event: 'job_failed',
            message: `System log purge: ${error?.message}`,
            meta: { job: 'system_log_purge' }
        })
    }
}

// Startup failures also go to stderr as one short line with the real driver reason,
// so `docker compose logs api` shows why the app is crash-looping
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

        await purgeSystemLogs()
        setInterval(purgeSystemLogs, LOG_PURGE_MS)
    } catch (error) {
        logger.error('APPLICATION START ERROR', { meta: error })
        reportFatal('APPLICATION START ERROR', error)
        server.close(() => {
            process.exit(1)
        })
    }
})()

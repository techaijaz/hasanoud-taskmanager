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

const server = app.listen(config.PORT, () => {
    logger.info('APPLICATION STARTED', {
        meta: {
            PORT: config.PORT,
            SERVER_URL: config.SERVER_URL
        }
    })
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
        server.close(() => {
            process.exit(1)
        })
    }
})()

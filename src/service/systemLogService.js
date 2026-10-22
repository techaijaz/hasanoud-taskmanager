import prisma from '../config/prisma.js'
import logger from '../util/logger.js'
import requestPath from '../util/requestPath.js'
import { addDaysYmd, istWallToUtc, isValidYmd } from '../util/ist.js'

export const SYSTEM_LOG_EVENTS = ['server_error', 'login_failed', 'rate_limited', 'forbidden', 'job_failed']
export const SYSTEM_LOG_LEVELS = ['info', 'warn', 'error']
const RETENTION_DAYS = 90
const PAGE_SIZE = 50

const clip = (value, max) => (value == null ? null : String(value).slice(0, max))

// Never throws: if the DB is down the event still reaches the file log
const record = async ({ level = 'warn', event, message, req, userId, meta }) => {
    try {
        await prisma.systemLog.create({
            data: {
                level,
                event,
                message: clip(message, 500) || event,
                requestId: req?.id || null,
                userId: userId || req?.authenticatedUser?.id || null,
                ip: clip(req?.ip, 45),
                method: clip(req?.method, 10),
                path: req ? requestPath(req) : null,
                meta: meta ?? undefined
            }
        })
    } catch (error) {
        logger.warn('SYSTEM_LOG_WRITE_FAILED', { meta: { event, message, reason: error.message } })
    }
}

const list = async ({ event, level, from, to, page }) => {
    const where = {}
    if (SYSTEM_LOG_EVENTS.includes(event)) where.event = event
    if (SYSTEM_LOG_LEVELS.includes(level)) where.level = level
    if (isValidYmd(from) || isValidYmd(to)) {
        where.createdAt = {}
        if (isValidYmd(from)) where.createdAt.gte = istWallToUtc(from, '00:00')
        if (isValidYmd(to)) where.createdAt.lt = istWallToUtc(addDaysYmd(to, 1), '00:00')
    }
    const pageNumber = Math.max(1, Number.parseInt(page, 10) || 1)
    const [rows, total] = await Promise.all([
        prisma.systemLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (pageNumber - 1) * PAGE_SIZE, take: PAGE_SIZE }),
        prisma.systemLog.count({ where })
    ])
    // userId is a plain column (no relation), so names are looked up separately
    const userIds = [...new Set(rows.map((row) => row.userId).filter(Boolean))]
    const users = userIds.length ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } }) : []
    const nameById = new Map(users.map((user) => [user.id, user.name]))
    return {
        rows: rows.map((row) => ({ ...row, userName: nameById.get(row.userId) || null })),
        total,
        page: pageNumber,
        pageSize: PAGE_SIZE,
        events: SYSTEM_LOG_EVENTS,
        levels: SYSTEM_LOG_LEVELS
    }
}

const purgeOld = () => prisma.systemLog.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000) } } })

export default { record, list, purgeOld }

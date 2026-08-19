import prisma from '../config/prisma.js'
import { getDescendantIds } from './reportingService.js'

const formatDueTime = (hhmm) => {
    const [hourRaw, minuteRaw] = String(hhmm || '00:00').split(':')
    const hour = Number(hourRaw)
    const minute = Number(minuteRaw)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const hour12 = hour % 12 || 12
    return `${hour12}:${String(minute).padStart(2, '0')} ${ampm}`
}

const joinNames = (names) => {
    const list = names.filter(Boolean)
    if (!list.length) return 'unassigned'
    if (list.length === 1) return list[0]
    if (list.length === 2) return `${list[0]} and ${list[1]}`
    return `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`
}

const assigneeRows = (instance) => instance.template?.assignees || []

const recipientIdsFor = (instance) => {
    const ids = new Set()
    for (const row of assigneeRows(instance)) {
        if (row.userId) ids.add(row.userId)
    }
    const createdBy = instance.template?.createdBy
    if (createdBy?.id) ids.add(createdBy.id)
    if (createdBy?.reportsToId) ids.add(createdBy.reportsToId)
    return [...ids]
}

const notificationInclude = {
    instance: {
        include: {
            location: { select: { id: true, name: true } },
            template: {
                select: {
                    id: true,
                    title: true,
                    assignees: {
                        include: {
                            user: { select: { id: true, name: true } }
                        }
                    }
                }
            }
        }
    },
    instanceItem: {
        select: { id: true, title: true, dueTime: true, status: true }
    }
}

const mapRow = (row) => ({
    id: row.id,
    instanceId: row.instanceId,
    instanceItemId: row.instanceItemId,
    message: row.message,
    resolved: row.resolved,
    resolvedAt: row.resolvedAt,
    createdAt: row.createdAt,
    scheduledDate: row.instance?.scheduledDate,
    location: row.instance?.location,
    template: row.instance?.template
        ? { id: row.instance.template.id, title: row.instance.template.title }
        : row.instance?.template,
    item: row.instanceItem,
    assignees: assigneeRows(row.instance).map((item) => item.user).filter(Boolean)
})

const dedupeByItem = (rows) => {
    const seen = new Set()
    const unique = []
    for (const row of rows) {
        if (seen.has(row.instanceItemId)) continue
        seen.add(row.instanceItemId)
        unique.push(mapRow(row))
    }
    return unique
}

const scopeWhere = async (actor) => {
    if (actor.role === 'admin') return {}
    if (actor.role === 'user') return { recipientId: actor.id }

    const descendantIds = await getDescendantIds(actor.id)
    const teamIds = [actor.id, ...descendantIds]
    const locations = await prisma.userLocation.findMany({
        where: { userId: actor.id },
        select: { locationId: true }
    })
    const locationIds = locations.map((row) => row.locationId)

    return {
        instance: {
            OR: [
                { template: { assignees: { some: { userId: { in: teamIds } } } } },
                ...(locationIds.length ? [{ locationId: { in: locationIds } }] : [])
            ]
        }
    }
}

export const resolveNotificationsForItem = async (instanceItemId) => {
    await prisma.taskNotification.updateMany({
        where: { instanceItemId, resolved: false },
        data: { resolved: true, resolvedAt: new Date() }
    })
}

export const syncMissedNotifications = async (ymd) => {
    const skipped = await prisma.taskInstance.findMany({
        where: { scheduledDate: ymd, status: 'skipped_holiday' },
        select: { id: true }
    })
    if (skipped.length) {
        await prisma.taskNotification.updateMany({
            where: { instanceId: { in: skipped.map((row) => row.id) }, resolved: false },
            data: { resolved: true, resolvedAt: new Date() }
        })
    }

    const items = await prisma.taskInstanceItem.findMany({
        where: {
            status: 'overdue',
            instance: { scheduledDate: ymd, status: { not: 'skipped_holiday' } }
        },
        include: {
            instance: {
                include: {
                    location: { select: { name: true } },
                    template: {
                        include: {
                            createdBy: { select: { id: true, reportsToId: true } },
                            assignees: {
                                include: {
                                    user: { select: { id: true, name: true } }
                                }
                            }
                        }
                    }
                }
            }
        }
    })

    const data = []
    for (const item of items) {
        const names = assigneeRows(item.instance).map((row) => row.user?.name)
        const locationName = item.instance.location?.name || 'Location'
        const raw = `${item.title} (${locationName}) missed its ${formatDueTime(item.dueTime)} deadline — assigned to ${joinNames(names)}.`
        const message = raw.slice(0, 500)
        for (const recipientId of recipientIdsFor(item.instance)) {
            data.push({
                recipientId,
                instanceId: item.instanceId,
                instanceItemId: item.id,
                message
            })
        }
    }

    if (!data.length) return 0
    const result = await prisma.taskNotification.createMany({ data, skipDuplicates: true })
    return result.count
}

export const listNotifications = async (actor) => {
    const where = await scopeWhere(actor)
    const rows = await prisma.taskNotification.findMany({
        where,
        include: notificationInclude,
        orderBy: { createdAt: 'desc' }
    })
    return dedupeByItem(rows)
}

export const unreadNotificationCount = async (actor) => {
    const where = await scopeWhere(actor)
    const rows = await prisma.taskNotification.findMany({
        where: { ...where, resolved: false },
        select: { instanceItemId: true }
    })
    return new Set(rows.map((row) => row.instanceItemId)).size
}

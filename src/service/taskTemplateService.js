import prisma from '../config/prisma.js'
import { getDescendantIds } from './reportingService.js'
import { todayIstYmd } from '../util/ist.js'
import {
    displayStatus,
    generateOneTimeInstance,
    generateRecurringForDate,
    getTodayInstanceForTemplate,
    reconcileDate,
    templateAppliesOnDate,
    applyTemplateItemsToDate
} from './taskInstanceService.js'

const DONE_STATUSES = ['done_on_time', 'done_late']

const templateInclude = {
    location: { select: { id: true, name: true } },
    createdBy: { select: { id: true, name: true, role: true } },
    assignees: {
        include: {
            user: { select: { id: true, name: true, role: true, email: true } }
        }
    },
    items: { orderBy: { sortOrder: 'asc' } },
    _count: {
        select: {
            instances: {
                where: {
                    OR: [
                        { status: { in: DONE_STATUSES } },
                        { items: { some: { status: { in: DONE_STATUSES } } } }
                    ]
                }
            }
        }
    }
}

const mapTemplate = (row, todayStatus = null) => {
    if (!row) return row
    const { _count, assignees, ...rest } = row
    return {
        ...rest,
        locked: row.kind === 'one_time' && (_count?.instances || 0) > 0,
        assignees: (assignees || []).map((item) => item.user),
        todayStatus
    }
}

export const getAssignableScope = async (actor) => {
    if (actor.role === 'admin') {
        const users = await prisma.user.findMany({
            select: { id: true, name: true, role: true, email: true },
            orderBy: { name: 'asc' }
        })
        const locations = await prisma.location.findMany({
            select: { id: true, name: true },
            orderBy: { name: 'asc' }
        })
        return {
            users,
            locations,
            hasReportees: users.some((user) => user.id !== actor.id),
            defaultAssigneeIds: [actor.id]
        }
    }

    const descendantIds = await getDescendantIds(actor.id)
    const visibleIds = [actor.id, ...descendantIds]
    const users = await prisma.user.findMany({
        where: { id: { in: visibleIds } },
        select: { id: true, name: true, role: true, email: true },
        orderBy: { name: 'asc' }
    })
    const locationRows = await prisma.userLocation.findMany({
        where: { userId: actor.id },
        include: { location: { select: { id: true, name: true } } }
    })
    const locations = locationRows.map((row) => row.location).sort((a, b) => a.name.localeCompare(b.name))
    const hasReportees = descendantIds.length > 0
    return {
        users,
        locations,
        hasReportees,
        defaultAssigneeIds: [actor.id]
    }
}

const listWhereForActor = async (actor, filters = {}) => {
    const where = {}
    if (filters.kind) where.kind = filters.kind
    if (filters.locationId) where.locationId = filters.locationId

    if (actor.role === 'admin') return where

    const descendantIds = await getDescendantIds(actor.id)
    const visibleUserIds = [actor.id, ...descendantIds]
    const locationIds = (
        await prisma.userLocation.findMany({
            where: { userId: actor.id },
            select: { locationId: true }
        })
    ).map((row) => row.locationId)

    const scopeOr = [
        { createdById: { in: visibleUserIds } },
        { assignees: { some: { userId: { in: visibleUserIds } } } }
    ]
    if (actor.role === 'manager' && locationIds.length) {
        scopeOr.push({ locationId: { in: locationIds } })
    }

    return { AND: [where, { OR: scopeOr }] }
}

export const canAccessTemplate = async (actor, template) => {
    if (actor.role === 'admin') return true
    const descendantIds = await getDescendantIds(actor.id)
    const visibleUserIds = new Set([actor.id, ...descendantIds])
    if (visibleUserIds.has(template.createdById)) return true
    if ((template.assignees || []).some((row) => visibleUserIds.has(row.userId || row.id))) return true
    if (actor.role === 'manager') {
        const locationIds = (
            await prisma.userLocation.findMany({
                where: { userId: actor.id },
                select: { locationId: true }
            })
        ).map((row) => row.locationId)
        if (locationIds.includes(template.locationId)) return true
    }
    return false
}

const assertAssigneesAndLocation = async (actor, assigneeIds, locationId) => {
    const scope = await getAssignableScope(actor)
    const allowedUserIds = new Set(scope.users.map((user) => user.id))
    const allowedLocationIds = new Set(scope.locations.map((loc) => loc.id))

    if (!allowedLocationIds.has(locationId)) {
        throw Object.assign(new Error('Choose a location you are mapped to'), { statusCode: 422 })
    }

    let ids = [...new Set(assigneeIds || [])]
    if (!ids.length) {
        if (!scope.hasReportees) ids = [actor.id]
        else throw Object.assign(new Error('Select at least one assignee'), { statusCode: 422 })
    }

    if (ids.some((id) => !allowedUserIds.has(id))) {
        throw Object.assign(new Error('You can only assign people in your team'), { statusCode: 403 })
    }

    return ids
}

const normalizeSchedule = (value) => {
    if (value.kind === 'one_time') {
        return {
            kind: 'one_time',
            recurrence: null,
            weekdays: null,
            scheduledDate: value.scheduledDate
        }
    }

    const recurrence = value.recurrence
    let weekdays = Array.isArray(value.weekdays) ? [...new Set(value.weekdays.map(Number))].sort() : []
    if (recurrence === 'daily') weekdays = null
    if (recurrence === 'weekly' && weekdays.length !== 1) {
        throw Object.assign(new Error('Weekly tasks need exactly one weekday'), { statusCode: 422 })
    }
    if (recurrence === 'custom' && weekdays.length < 1) {
        throw Object.assign(new Error('Custom tasks need at least one weekday'), { statusCode: 422 })
    }

    return {
        kind: 'recurring',
        recurrence,
        weekdays,
        scheduledDate: null
    }
}

const normalizeItems = (items) => {
    const list = Array.isArray(items) ? items : []
    const next = list
        .map((item, index) => ({
            id: item?.id || null,
            title: String(item?.title ?? '').trim(),
            dueTime: String(item?.dueTime || '').slice(0, 5),
            sortOrder: index
        }))
        .filter((item) => item.title.length >= 2 && /^\d{2}:\d{2}$/.test(item.dueTime))
    if (!next.length) {
        throw Object.assign(new Error('Add at least one sub task with a due time'), { statusCode: 422 })
    }
    return next
}

const replaceItems = async (tx, templateId, items) => {
    await tx.taskTemplateItem.deleteMany({ where: { templateId } })
    await tx.taskTemplateItem.createMany({
        data: items.map((item) => ({
            templateId,
            title: item.title,
            dueTime: item.dueTime,
            sortOrder: item.sortOrder
        }))
    })
}

const upsertTemplateItems = async (tx, templateId, items, existingItems) => {
    const existingIds = new Set((existingItems || []).map((item) => item.id))
    const keepIds = []
    const next = []
    for (const item of items) {
        if (item.id && existingIds.has(item.id)) {
            const updated = await tx.taskTemplateItem.update({
                where: { id: item.id },
                data: {
                    title: item.title,
                    dueTime: item.dueTime,
                    sortOrder: item.sortOrder
                }
            })
            keepIds.push(updated.id)
            next.push(updated)
        } else {
            const created = await tx.taskTemplateItem.create({
                data: {
                    templateId,
                    title: item.title,
                    dueTime: item.dueTime,
                    sortOrder: item.sortOrder
                }
            })
            keepIds.push(created.id)
            next.push(created)
        }
    }
    await tx.taskTemplateItem.deleteMany({
        where: { templateId, id: { notIn: keepIds } }
    })
    return next
}

const replaceAssignees = async (tx, templateId, assigneeIds) => {
    await tx.taskTemplateAssignee.deleteMany({ where: { templateId } })
    await tx.taskTemplateAssignee.createMany({
        data: assigneeIds.map((userId) => ({ templateId, userId }))
    })
}

const withTodayStatus = async (row) => {
    const today = todayIstYmd()
    if (!templateAppliesOnDate(row, today)) {
        return mapTemplate(row, null)
    }
    const instance = await getTodayInstanceForTemplate(row.id, today)
    return mapTemplate(row, displayStatus(instance))
}

export const listTemplates = async (actor, filters) => {
    const today = todayIstYmd()
    await generateRecurringForDate(today)
    await reconcileDate(today)
    const where = await listWhereForActor(actor, filters)
    const rows = await prisma.taskTemplate.findMany({
        where,
        include: templateInclude,
        orderBy: { createdAt: 'desc' }
    })
    const mapped = []
    for (const row of rows) {
        mapped.push(await withTodayStatus(row))
    }
    return mapped
}

export const getTemplateById = async (id) => {
    const row = await prisma.taskTemplate.findUnique({
        where: { id },
        include: templateInclude
    })
    if (!row) return row
    return withTodayStatus(row)
}

export const createTemplate = async (actor, payload) => {
    const schedule = normalizeSchedule(payload)
    if (schedule.kind === 'one_time' && schedule.scheduledDate < todayIstYmd()) {
        throw Object.assign(new Error('One-time date cannot be in the past'), { statusCode: 422 })
    }
    const assigneeIds = [
        ...new Set([actor.id, ...(await assertAssigneesAndLocation(actor, payload.assigneeIds, payload.locationId))])
    ]
    const items = normalizeItems(payload.items)

    const createdId = await prisma.$transaction(async (tx) => {
        const template = await tx.taskTemplate.create({
            data: {
                title: payload.title,
                locationId: payload.locationId,
                priority: payload.priority,
                kind: schedule.kind,
                recurrence: schedule.recurrence,
                weekdays: schedule.weekdays,
                scheduledDate: schedule.scheduledDate,
                skipOnHoliday: payload.skipOnHoliday !== false,
                createdById: actor.id
            }
        })
        await replaceAssignees(tx, template.id, assigneeIds)
        await replaceItems(tx, template.id, items)
        return template.id
    })

    const created = await prisma.taskTemplate.findUnique({
        where: { id: createdId },
        include: { assignees: true, items: { orderBy: { sortOrder: 'asc' } } }
    })
    if (schedule.kind === 'one_time') {
        await generateOneTimeInstance(created, schedule.scheduledDate)
    } else {
        await generateRecurringForDate(todayIstYmd())
    }

    return getTemplateById(createdId)
}

export const updateTemplate = async (actor, id, payload) => {
    const existing = await prisma.taskTemplate.findUnique({
        where: { id },
        include: { assignees: true, items: { orderBy: { sortOrder: 'asc' } } }
    })
    if (!existing) return null
    const allowed = await canAccessTemplate(actor, existing)
    if (!allowed) {
        throw Object.assign(new Error('FORBIDDEN_ACCESS: Access denied for your role'), { statusCode: 403 })
    }

    const mapped = await getTemplateById(id)
    if (mapped.locked) {
        throw Object.assign(new Error('This one-time task is locked after the first Done day'), { statusCode: 422 })
    }

    const schedule = normalizeSchedule({
        kind: payload.kind ?? existing.kind,
        recurrence: payload.recurrence ?? existing.recurrence,
        weekdays: payload.weekdays ?? existing.weekdays,
        scheduledDate: payload.scheduledDate ?? existing.scheduledDate
    })

    if (schedule.kind === 'one_time' && schedule.scheduledDate < todayIstYmd()) {
        throw Object.assign(new Error('One-time date cannot be in the past'), { statusCode: 422 })
    }

    const locationId = payload.locationId ?? existing.locationId
    const assigneeIds = await assertAssigneesAndLocation(
        actor,
        payload.assigneeIds ?? existing.assignees.map((row) => row.userId),
        locationId
    )
    const items = payload.items !== undefined ? normalizeItems(payload.items) : null
    const previousItems = existing.items || []
    const today = todayIstYmd()

    await prisma.$transaction(async (tx) => {
        await tx.taskTemplate.update({
            where: { id },
            data: {
                title: payload.title ?? existing.title,
                locationId,
                priority: payload.priority ?? existing.priority,
                kind: schedule.kind,
                recurrence: schedule.recurrence,
                weekdays: schedule.weekdays,
                scheduledDate: schedule.scheduledDate
            }
        })
        await replaceAssignees(tx, id, assigneeIds)
        if (items) {
            await upsertTemplateItems(tx, id, items, previousItems)
        }
        if (schedule.kind === 'one_time') {
            await tx.taskInstance.deleteMany({
                where: {
                    templateId: id,
                    status: { notIn: DONE_STATUSES },
                    scheduledDate: { not: schedule.scheduledDate }
                }
            })
        }
    })

    const next = await prisma.taskTemplate.findUnique({
        where: { id },
        include: { assignees: true, items: { orderBy: { sortOrder: 'asc' } } }
    })

    if (schedule.kind === 'one_time') {
        const onDate = await getTodayInstanceForTemplate(id, schedule.scheduledDate)
        if (onDate && schedule.scheduledDate >= today) {
            await applyTemplateItemsToDate(next, schedule.scheduledDate, previousItems)
        } else if (!onDate) {
            await generateOneTimeInstance(next, schedule.scheduledDate)
        }
    } else if (templateAppliesOnDate(next, today)) {
        const todayInstance = await getTodayInstanceForTemplate(id, today)
        if (todayInstance) {
            await applyTemplateItemsToDate(next, today, previousItems)
        } else {
            await generateRecurringForDate(today)
        }
    } else {
        await prisma.taskInstance.deleteMany({
            where: { templateId: id, scheduledDate: today, status: { notIn: DONE_STATUSES } }
        })
    }

    await reconcileDate(today)
    return getTemplateById(id)
}

export const setSkipOnHoliday = async (actor, id, skipOnHoliday) => {
    const existing = await prisma.taskTemplate.findUnique({
        where: { id },
        include: { assignees: true }
    })
    if (!existing) return null
    const allowed = await canAccessTemplate(actor, existing)
    if (!allowed) {
        throw Object.assign(new Error('FORBIDDEN_ACCESS: Access denied for your role'), { statusCode: 403 })
    }
    const mapped = await getTemplateById(id)
    if (mapped.locked) {
        throw Object.assign(new Error('This one-time task is locked after the first Done day'), { statusCode: 422 })
    }

    await prisma.$transaction(async (tx) => {
        await tx.taskTemplate.update({
            where: { id },
            data: { skipOnHoliday }
        })
        await tx.taskInstance.updateMany({
            where: { templateId: id, status: { in: ['pending', 'overdue', 'skipped_holiday'] } },
            data: { skipOnHoliday }
        })
    })

    return getTemplateById(id)
}

export const deleteTemplate = async (actor, id) => {
    const existing = await prisma.taskTemplate.findUnique({
        where: { id },
        include: { assignees: true }
    })
    if (!existing) return null
    const allowed = await canAccessTemplate(actor, existing)
    if (!allowed) {
        throw Object.assign(new Error('FORBIDDEN_ACCESS: Access denied for your role'), { statusCode: 403 })
    }
    await prisma.taskTemplate.delete({ where: { id } })
    return true
}

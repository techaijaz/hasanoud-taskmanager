import prisma from '../config/prisma.js'
import { getDescendantIds } from './reportingService.js'
import { addMinutes, isSundayYmd, istWallToUtc, todayIstYmd, weekdayOfYmd } from '../util/ist.js'
import { resolveNotificationsForItem, syncMissedNotifications } from './notificationService.js'

const DONE_STATUSES = ['done_on_time', 'done_late']

const instanceInclude = {
    location: { select: { id: true, name: true } },
    template: {
        select: {
            id: true,
            title: true,
            priority: true,
            kind: true,
            assignees: {
                include: {
                    user: { select: { id: true, name: true, role: true } }
                }
            }
        }
    },
    items: {
        orderBy: { sortOrder: 'asc' },
        include: {
            completedBy: { select: { id: true, name: true } },
            photos: {
                orderBy: { createdAt: 'asc' },
                select: { id: true, url: true, publicId: true }
            }
        }
    }
}

export const templateAppliesOnDate = (template, ymd) => {
    if (template.kind === 'one_time') return template.scheduledDate === ymd
    if (template.recurrence === 'daily') return true
    const days = Array.isArray(template.weekdays) ? template.weekdays.map(Number) : []
    return days.includes(weekdayOfYmd(ymd))
}

const holidayLocationIdsForDate = async (ymd) => {
    const rows = await prisma.holiday.findMany({
        where: { date: ymd },
        select: { locationId: true }
    })
    return {
        all: rows.some((row) => !row.locationId),
        ids: new Set(rows.map((row) => row.locationId).filter(Boolean))
    }
}

const isOffDay = (ymd, locationId, holidays) =>
    isSundayYmd(ymd) || holidays.all || holidays.ids.has(locationId)

const itemTimes = (ymd, dueTime) => {
    const dueAt = istWallToUtc(ymd, dueTime)
    return { dueAt, overdueAt: addMinutes(dueAt, 5) }
}

const parentTimesFromItems = (items) => {
    const dueAt = items.reduce((min, item) => (item.dueAt < min ? item.dueAt : min), items[0].dueAt)
    const overdueAt = items.reduce((min, item) => (item.overdueAt < min ? item.overdueAt : min), items[0].overdueAt)
    return { dueAt, overdueAt }
}

export const displayStatus = (instance) => {
    if (!instance) return null
    if (instance.status === 'skipped_holiday') {
        return { key: 'skipped', label: 'Skipped', doneCount: 0, itemCount: (instance.items || []).length }
    }
    const items = instance.items || []
    const itemCount = items.length
    const doneCount = items.filter((item) => DONE_STATUSES.includes(item.status)).length
    if (itemCount && doneCount === itemCount) {
        const late = items.some((item) => item.late || item.status === 'done_late')
        return {
            key: late ? 'done_late' : 'done',
            label: late ? 'Done late' : 'Done',
            doneCount,
            itemCount
        }
    }
    if (doneCount > 0) {
        return { key: 'in_progress', label: 'In progress', doneCount, itemCount }
    }
    if (new Date() > instance.overdueAt) {
        return { key: 'not_done', label: 'Not done', doneCount, itemCount }
    }
    return { key: 'pending', label: 'Pending', doneCount, itemCount }
}

const createInstanceFromTemplate = async (template, ymd) => {
    const items = (template.items || []).map((item, index) => {
        const times = itemTimes(ymd, item.dueTime)
        return {
            title: item.title,
            dueTime: item.dueTime,
            sortOrder: item.sortOrder ?? index,
            dueAt: times.dueAt,
            overdueAt: times.overdueAt,
            status: 'pending'
        }
    })
    if (!items.length) return null
    const count = await prisma.taskInstance.count({ where: { scheduledDate: ymd } })
    const col = count % 3
    const rowN = Math.floor(count / 3)
    const { dueAt, overdueAt } = parentTimesFromItems(items)
    return prisma.taskInstance.create({
        data: {
            templateId: template.id,
            locationId: template.locationId,
            scheduledDate: ymd,
            dueAt,
            overdueAt,
            status: 'pending',
            skipOnHoliday: template.skipOnHoliday,
            boardX: 4 + col * 32,
            boardY: 4 + rowN * 24,
            boardZ: count,
            items: { create: items }
        }
    })
}

export const generateRecurringForDate = async (ymd) => {
    const templates = await prisma.taskTemplate.findMany({
        where: { kind: 'recurring' },
        include: { items: { orderBy: { sortOrder: 'asc' } } }
    })
    const due = templates.filter((row) => templateAppliesOnDate(row, ymd))

    for (const template of due) {
        const existing = await prisma.taskInstance.findUnique({
            where: { templateId_scheduledDate: { templateId: template.id, scheduledDate: ymd } }
        })
        if (existing) continue
        await createInstanceFromTemplate(template, ymd)
    }
}

export const generateOneTimeInstance = async (template, ymd) => {
    const existing = await prisma.taskInstance.findUnique({
        where: { templateId_scheduledDate: { templateId: template.id, scheduledDate: ymd } }
    })
    if (existing) return existing
    return createInstanceFromTemplate(template, ymd)
}

export const reconcileDate = async (ymd) => {
    const holidayIds = await holidayLocationIdsForDate(ymd)
    const rows = await prisma.taskInstance.findMany({
        where: { scheduledDate: ymd },
        include: { items: true }
    })

    for (const row of rows) {
        if (DONE_STATUSES.includes(row.status)) continue
        const off = isOffDay(ymd, row.locationId, holidayIds)
        if (row.skipOnHoliday && off) {
            if (row.status !== 'skipped_holiday') {
                await prisma.taskInstance.update({ where: { id: row.id }, data: { status: 'skipped_holiday' } })
            }
            continue
        }

        const now = new Date()
        for (const item of row.items || []) {
            if (DONE_STATUSES.includes(item.status)) continue
            const next = now > item.overdueAt ? 'overdue' : 'pending'
            if (item.status !== next) {
                await prisma.taskInstanceItem.update({ where: { id: item.id }, data: { status: next } })
            }
        }

        const items = row.items || []
        const doneCount = items.filter((item) => DONE_STATUSES.includes(item.status)).length
        let parent = 'pending'
        if (items.length && doneCount === items.length) {
            const late = items.some((item) => item.late || item.status === 'done_late')
            parent = late ? 'done_late' : 'done_on_time'
        } else if (doneCount === 0 && now > row.overdueAt) {
            parent = 'overdue'
        }
        if (row.status !== parent) {
            await prisma.taskInstance.update({ where: { id: row.id }, data: { status: parent } })
        }
    }

    await syncMissedNotifications(ymd)
    return holidayIds
}

const visibleUserIdsFor = async (actor) => {
    if (actor.role === 'admin') return null
    const descendantIds = await getDescendantIds(actor.id)
    return new Set([actor.id, ...descendantIds])
}

const locationIdsFor = async (actor) => {
    const rows = await prisma.userLocation.findMany({
        where: { userId: actor.id },
        select: { locationId: true }
    })
    return rows.map((row) => row.locationId)
}

const assigneeRows = (instance) => instance.template?.assignees || []

const assigneeIdsOf = (instance) =>
    assigneeRows(instance).map((row) => row.userId || row.user?.id).filter(Boolean)

const canSeeInstance = async (actor, instance, visibleUserIds, locationIds) => {
    if (actor.role === 'admin') return true
    const assigneeIds = assigneeIdsOf(instance)
    if (assigneeIds.some((id) => visibleUserIds.has(id))) return true
    if (actor.role === 'manager' && locationIds.includes(instance.locationId)) return true
    return false
}

export const canActOnInstance = async (actor, instance) => {
    if (actor.role === 'admin') return true
    const assigneeIds = assigneeIdsOf(instance)
    if (assigneeIds.includes(actor.id)) return true
    const descendants = await getDescendantIds(actor.id)
    if (assigneeIds.some((id) => descendants.includes(id))) return true
    const managers = await prisma.user.findMany({
        where: { id: { in: assigneeIds } },
        select: { reportsToId: true }
    })
    return managers.some((row) => row.reportsToId === actor.id)
}

const rollupParentStatus = (instance) => {
    const items = instance.items || []
    if (instance.status === 'skipped_holiday') return 'skipped_holiday'
    if (!items.length) return instance.status === 'skipped_holiday' ? 'skipped_holiday' : 'pending'
    const open = items.filter((item) => !DONE_STATUSES.includes(item.status))
    if (open.length) {
        const doneCount = items.length - open.length
        if (doneCount === 0 && new Date() > instance.overdueAt) return 'overdue'
        return 'pending'
    }
    const late = items.some((item) => item.late || item.status === 'done_late')
    return late ? 'done_late' : 'done_on_time'
}

const mapInstance = (row, { holidayIds, canAct }) => {
    const offDay = isOffDay(row.scheduledDate, row.locationId, holidayIds)
    const assignees = assigneeRows(row).map((item) => item.user).filter(Boolean)
    const todayStatus = displayStatus(row)
    const items = (row.items || []).map((item) => ({
        id: item.id,
        title: item.title,
        dueTime: item.dueTime,
        sortOrder: item.sortOrder,
        dueAt: item.dueAt,
        overdueAt: item.overdueAt,
        status: item.status,
        completedAt: item.completedAt,
        note: item.note,
        late: item.late,
        completedBy: item.completedBy || null,
        photos: item.photos || [],
        canComplete: canAct && ['pending', 'overdue'].includes(item.status) && row.status !== 'skipped_holiday'
    }))
    const template = row.template
        ? {
              id: row.template.id,
              title: row.template.title,
              priority: row.template.priority,
              kind: row.template.kind
          }
        : row.template
    return {
        id: row.id,
        scheduledDate: row.scheduledDate,
        dueAt: row.dueAt,
        overdueAt: row.overdueAt,
        status: row.status,
        todayStatus,
        boardX: Number(row.boardX ?? 4),
        boardY: Number(row.boardY ?? 4),
        boardZ: row.boardZ || 0,
        skipOnHoliday: row.skipOnHoliday,
        completedAt: row.completedAt,
        late: row.late,
        offDay,
        itemCount: todayStatus?.itemCount || items.length,
        doneCount: todayStatus?.doneCount || 0,
        items,
        canToggleSkip: canAct && !DONE_STATUSES.includes(row.status),
        location: row.location,
        template,
        assignees
    }
}

export const listInstancesForDate = async (actor, ymd) => {
    const today = todayIstYmd()
    if (ymd >= today) {
        await generateRecurringForDate(ymd)
    }

    const holidayIds = await reconcileDate(ymd)
    const visibleUserIds = await visibleUserIdsFor(actor)
    const locationIds = actor.role === 'manager' ? await locationIdsFor(actor) : []

    const rows = await prisma.taskInstance.findMany({
        where: { scheduledDate: ymd },
        include: instanceInclude,
        orderBy: [{ boardZ: 'asc' }, { dueAt: 'asc' }]
    })

    const visible = []
    for (const row of rows) {
        const allowed = await canSeeInstance(actor, row, visibleUserIds, locationIds)
        if (!allowed) continue
        const canAct = await canActOnInstance(actor, row)
        visible.push(mapInstance(row, { holidayIds, canAct }))
    }
    return visible
}

const loadInstance = (id) => prisma.taskInstance.findUnique({ where: { id }, include: instanceInclude })

export const getTodayInstanceForTemplate = async (templateId, ymd) => {
    return prisma.taskInstance.findUnique({
        where: { templateId_scheduledDate: { templateId, scheduledDate: ymd } },
        include: { items: true }
    })
}

const matchInstanceItem = (instanceItems, previousItem, used) => {
    if (!previousItem) return null
    return (
        instanceItems.find(
            (row) => !used.has(row.id) && row.title === previousItem.title && row.sortOrder === previousItem.sortOrder
        ) || instanceItems.find((row) => !used.has(row.id) && row.title === previousItem.title)
    )
}

export const applyTemplateItemsToDate = async (template, ymd, previousItems = []) => {
    if (ymd < todayIstYmd()) return
    const instance = await prisma.taskInstance.findUnique({
        where: { templateId_scheduledDate: { templateId: template.id, scheduledDate: ymd } },
        include: { items: true }
    })
    if (!instance) return

    const prevById = new Map((previousItems || []).map((item) => [item.id, item]))
    const nextItems = template.items || []
    const nextIds = new Set(nextItems.map((item) => item.id))
    const instanceItems = instance.items || []
    const used = new Set()

    for (const templateItem of nextItems) {
        const previousItem = prevById.get(templateItem.id)
        const existing = matchInstanceItem(instanceItems, previousItem, used)
        const times = itemTimes(ymd, templateItem.dueTime)
        if (existing) {
            used.add(existing.id)
            if (DONE_STATUSES.includes(existing.status)) continue
            await prisma.taskInstanceItem.update({
                where: { id: existing.id },
                data: {
                    title: templateItem.title,
                    dueTime: templateItem.dueTime,
                    sortOrder: templateItem.sortOrder,
                    dueAt: times.dueAt,
                    overdueAt: times.overdueAt
                }
            })
            continue
        }
        await prisma.taskInstanceItem.create({
            data: {
                instanceId: instance.id,
                title: templateItem.title,
                dueTime: templateItem.dueTime,
                sortOrder: templateItem.sortOrder,
                dueAt: times.dueAt,
                overdueAt: times.overdueAt,
                status: 'pending'
            }
        })
    }

    for (const previousItem of previousItems || []) {
        if (nextIds.has(previousItem.id)) continue
        const existing = matchInstanceItem(instanceItems, previousItem, used)
        if (!existing || DONE_STATUSES.includes(existing.status)) continue
        used.add(existing.id)
        await prisma.taskInstanceItem.delete({ where: { id: existing.id } })
    }

    if (template.locationId && template.locationId !== instance.locationId) {
        await prisma.taskInstance.update({
            where: { id: instance.id },
            data: { locationId: template.locationId }
        })
    }

    await persistParent(instance.id)
}

export const setInstanceSkipOnHoliday = async (actor, id, skipOnHoliday) => {
    const existing = await loadInstance(id)
    if (!existing) return null
    const visibleUserIds = await visibleUserIdsFor(actor)
    const locationIds = actor.role === 'manager' ? await locationIdsFor(actor) : []
    if (!(await canSeeInstance(actor, existing, visibleUserIds, locationIds))) {
        throw Object.assign(new Error('FORBIDDEN_ACCESS: Access denied for your role'), { statusCode: 403 })
    }
    if (!(await canActOnInstance(actor, existing))) {
        throw Object.assign(new Error('FORBIDDEN_ACCESS: Access denied for your role'), { statusCode: 403 })
    }
    if (DONE_STATUSES.includes(existing.status)) {
        throw Object.assign(new Error('Completed tasks cannot be changed'), { statusCode: 422 })
    }

    await prisma.taskInstance.update({
        where: { id },
        data: { skipOnHoliday }
    })
    await reconcileDate(existing.scheduledDate)
    const updated = await loadInstance(id)
    const holidayIds = await holidayLocationIdsForDate(existing.scheduledDate)
    const canAct = await canActOnInstance(actor, updated)
    return mapInstance(updated, { holidayIds, canAct })
}

export const completeInstanceItem = async (actor, instanceId, itemId, { note, photos }) => {
    const existing = await loadInstance(instanceId)
    if (!existing) return null
    const item = (existing.items || []).find((row) => row.id === itemId)
    if (!item) {
        throw Object.assign(new Error('Step not found'), { statusCode: 404 })
    }
    const visibleUserIds = await visibleUserIdsFor(actor)
    const locationIds = actor.role === 'manager' ? await locationIdsFor(actor) : []
    if (!(await canSeeInstance(actor, existing, visibleUserIds, locationIds))) {
        throw Object.assign(new Error('FORBIDDEN_ACCESS: Access denied for your role'), { statusCode: 403 })
    }
    if (!(await canActOnInstance(actor, existing))) {
        throw Object.assign(new Error('FORBIDDEN_ACCESS: Access denied for your role'), { statusCode: 403 })
    }
    if (existing.status === 'skipped_holiday') {
        throw Object.assign(new Error('Turn off skip to work this day, then mark done'), { statusCode: 422 })
    }
    if (DONE_STATUSES.includes(item.status)) {
        throw Object.assign(new Error('This step is already done'), { statusCode: 422 })
    }
    if (!photos?.length || photos.length > 5) {
        throw Object.assign(new Error('Add 1 to 5 photos'), { statusCode: 422 })
    }

    const completedAt = new Date()
    const late = completedAt > item.overdueAt

    await prisma.$transaction(async (tx) => {
        await tx.taskInstanceItem.update({
            where: { id: itemId },
            data: {
                status: late ? 'done_late' : 'done_on_time',
                late,
                completedAt,
                completedById: actor.id,
                note: note || null
            }
        })
        await tx.taskInstancePhoto.createMany({
            data: photos.map((photo) => ({
                instanceId,
                instanceItemId: itemId,
                url: photo.url,
                publicId: photo.publicId
            }))
        })
    })

    await resolveNotificationsForItem(itemId)

    const refreshed = await loadInstance(instanceId)
    const parentStatus = rollupParentStatus(refreshed)
    const allDone = DONE_STATUSES.includes(parentStatus)
    await prisma.taskInstance.update({
        where: { id: instanceId },
        data: {
            status: parentStatus,
            late: allDone ? parentStatus === 'done_late' : false,
            completedAt: allDone ? completedAt : null
        }
    })

    const updated = await loadInstance(instanceId)
    const holidayIds = await holidayLocationIdsForDate(existing.scheduledDate)
    const canAct = await canActOnInstance(actor, updated)
    return mapInstance(updated, { holidayIds, canAct })
}

const persistParent = async (instanceId) => {
    const row = await prisma.taskInstance.findUnique({
        where: { id: instanceId },
        include: { items: true }
    })
    if (!row) return
    const items = row.items || []
    const data = { status: rollupParentStatus(row) }
    if (items.length) {
        Object.assign(data, parentTimesFromItems(items))
    }
    if (!DONE_STATUSES.includes(data.status)) {
        data.completedAt = null
        data.late = false
    }
    await prisma.taskInstance.update({ where: { id: instanceId }, data })
}

export const moveBoardItem = async (actor, sourceInstanceId, itemId, { targetInstanceId, itemIds }) => {
    const source = await loadInstance(sourceInstanceId)
    const target = await loadInstance(targetInstanceId)
    if (!source || !target) return null

    const visibleUserIds = await visibleUserIdsFor(actor)
    const locationIds = actor.role === 'manager' ? await locationIdsFor(actor) : []
    if (!(await canSeeInstance(actor, source, visibleUserIds, locationIds))) {
        throw Object.assign(new Error('FORBIDDEN_ACCESS: Access denied for your role'), { statusCode: 403 })
    }
    if (!(await canSeeInstance(actor, target, visibleUserIds, locationIds))) {
        throw Object.assign(new Error('FORBIDDEN_ACCESS: Access denied for your role'), { statusCode: 403 })
    }
    if (!(await canActOnInstance(actor, source)) || !(await canActOnInstance(actor, target))) {
        throw Object.assign(new Error('FORBIDDEN_ACCESS: Access denied for your role'), { statusCode: 403 })
    }
    if (source.scheduledDate !== target.scheduledDate) {
        throw Object.assign(new Error('Can only move tasks on the same date'), { statusCode: 422 })
    }

    const onSource = (source.items || []).some((row) => row.id === itemId)
    const onTarget = (target.items || []).some((row) => row.id === itemId)
    if (!onSource && !onTarget) {
        throw Object.assign(new Error('Step not found'), { statusCode: 404 })
    }

    const unique = [...new Set(itemIds)]
    if (unique.length !== itemIds.length || !itemIds.includes(itemId)) {
        throw Object.assign(new Error('Invalid task order'), { statusCode: 422 })
    }

    const targetIds = new Set((target.items || []).map((row) => row.id))
    if (sourceInstanceId === targetInstanceId) {
        const current = (source.items || []).map((row) => row.id).sort()
        const next = [...itemIds].sort()
        if (current.join() !== next.join()) {
            throw Object.assign(new Error('Invalid task order'), { statusCode: 422 })
        }
    } else {
        const expected = [...targetIds, itemId].sort()
        const next = [...itemIds].sort()
        if (expected.join() !== next.join()) {
            throw Object.assign(new Error('Invalid task order'), { statusCode: 422 })
        }
    }

    await prisma.$transaction(async (tx) => {
        if (sourceInstanceId !== targetInstanceId) {
            await tx.taskInstanceItem.update({
                where: { id: itemId },
                data: { instanceId: targetInstanceId }
            })
            await tx.taskInstancePhoto.updateMany({
                where: { instanceItemId: itemId },
                data: { instanceId: targetInstanceId }
            })
            const leftover = (source.items || []).filter((row) => row.id !== itemId)
            await Promise.all(
                leftover.map((row, index) =>
                    tx.taskInstanceItem.update({ where: { id: row.id }, data: { sortOrder: index } })
                )
            )
        }
        await Promise.all(
            itemIds.map((id, index) => tx.taskInstanceItem.update({ where: { id }, data: { sortOrder: index } }))
        )
    })

    await persistParent(sourceInstanceId)
    if (targetInstanceId !== sourceInstanceId) await persistParent(targetInstanceId)

    const holidayIds = await holidayLocationIdsForDate(source.scheduledDate)
    const updated = await loadInstance(targetInstanceId)
    const canAct = await canActOnInstance(actor, updated)
    return mapInstance(updated, { holidayIds, canAct })
}

export const placeOnBoard = async (actor, id, { x, y, z }) => {
    const existing = await loadInstance(id)
    if (!existing) return null
    const visibleUserIds = await visibleUserIdsFor(actor)
    const locationIds = actor.role === 'manager' ? await locationIdsFor(actor) : []
    if (!(await canSeeInstance(actor, existing, visibleUserIds, locationIds))) {
        throw Object.assign(new Error('FORBIDDEN_ACCESS: Access denied for your role'), { statusCode: 403 })
    }
    if (!(await canActOnInstance(actor, existing))) {
        throw Object.assign(new Error('FORBIDDEN_ACCESS: Access denied for your role'), { statusCode: 403 })
    }

    const boardX = Math.min(92, Math.max(0, Number(x)))
    const boardY = Math.min(92, Math.max(0, Number(y)))
    const maxZ = await prisma.taskInstance.aggregate({
        where: { scheduledDate: existing.scheduledDate },
        _max: { boardZ: true }
    })
    const boardZ = Number.isInteger(z) ? z : (maxZ._max.boardZ || 0) + 1

    await prisma.taskInstance.update({
        where: { id },
        data: { boardX, boardY, boardZ }
    })

    const updated = await loadInstance(id)
    const holidayIds = await holidayLocationIdsForDate(existing.scheduledDate)
    const canAct = await canActOnInstance(actor, updated)
    return mapInstance(updated, { holidayIds, canAct })
}

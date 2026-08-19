import prisma from '../config/prisma.js'
import { getDescendantIds } from './reportingService.js'
import { addDaysYmd } from '../util/ist.js'

const DONE = new Set(['done_on_time', 'done_late'])

const emptyCounts = () => ({ onTime: 0, late: 0, missed: 0, covered: 0, open: 0 })

const rates = (counts) => {
    const scored = counts.onTime + counts.late + counts.missed
    const assigned = scored + (counts.covered || 0)
    const pct = (n) => (scored ? Math.round((n / scored) * 1000) / 10 : 0)
    return {
        ...counts,
        scored,
        assigned,
        onTimePct: pct(counts.onTime),
        latePct: pct(counts.late),
        missedPct: pct(counts.missed),
        missedLatePct: pct(counts.late + counts.missed)
    }
}

const bump = (counts, outcome) => {
    if (outcome === 'on_time') counts.onTime += 1
    else if (outcome === 'late') counts.late += 1
    else if (outcome === 'missed') counts.missed += 1
    else if (outcome === 'covered') counts.covered += 1
    else if (outcome === 'open') counts.open += 1
}

const employeeOutcome = (user, instanceOutcome, completerIds) => {
    if (instanceOutcome === 'open' || instanceOutcome === 'missed') return instanceOutcome
    if (!completerIds.size) return instanceOutcome
    return completerIds.has(user.id) ? instanceOutcome : 'covered'
}

const completerIdsOf = (instance) =>
    new Set((instance.items || []).map((item) => item.completedById).filter(Boolean))

const completerNamesOf = (instance) => {
    const names = []
    const seen = new Set()
    for (const item of instance.items || []) {
        const name = item.completedBy?.name
        const id = item.completedById
        if (!id || seen.has(id)) continue
        seen.add(id)
        names.push(name || 'Someone')
    }
    return names
}

const classifyInstance = (instance, now) => {
    if (instance.status === 'skipped_holiday') return null
    const items = instance.items || []
    const done = items.filter((item) => DONE.has(item.status))
    if (items.length && done.length === items.length) {
        return items.some((item) => item.late || item.status === 'done_late') ? 'late' : 'on_time'
    }
    if (now >= new Date(instance.overdueAt)) return 'missed'
    return 'open'
}

const ymdList = (from, to) => {
    const days = []
    let cursor = from
    let guard = 0
    while (cursor <= to && guard < 400) {
        days.push(cursor)
        cursor = addDaysYmd(cursor, 1)
        guard += 1
    }
    return days
}

const visibleUserIdsFor = async (actor) => {
    if (actor.role === 'admin') return null
    if (actor.role === 'user') return new Set([actor.id])
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

const assigneeIdsOf = (instance) =>
    (instance.template?.assignees || []).map((row) => row.userId || row.user?.id).filter(Boolean)

const canSeeInstance = (actor, instance, visibleUserIds, locationIds) => {
    if (actor.role === 'admin') return true
    const assigneeIds = assigneeIdsOf(instance)
    if (visibleUserIds && assigneeIds.some((id) => visibleUserIds.has(id))) return true
    if (actor.role === 'manager' && locationIds.includes(instance.locationId)) return true
    return false
}

export const getReports = async (actor, { from, to, locationId }) => {
    if (from > to) {
        const error = new Error('from must be on or before to')
        error.statusCode = 422
        throw error
    }
    const span = ymdList(from, to)
    if (span.length > 92) {
        const error = new Error('Date range cannot exceed 92 days')
        error.statusCode = 422
        throw error
    }

    const visibleUserIds = await visibleUserIdsFor(actor)
    const locationIds = actor.role === 'manager' ? await locationIdsFor(actor) : []

    if (locationId && actor.role === 'manager' && !locationIds.includes(locationId)) {
        const error = new Error('FORBIDDEN_ACCESS: Access denied for your role')
        error.statusCode = 403
        throw error
    }

    const where = {
        scheduledDate: { gte: from, lte: to },
        ...(locationId ? { locationId } : {})
    }

    const rows = await prisma.taskInstance.findMany({
        where,
        include: {
            location: { select: { id: true, name: true } },
            template: {
                select: {
                    id: true,
                    title: true,
                    assignees: {
                        include: { user: { select: { id: true, name: true, role: true } } }
                    }
                }
            },
            items: {
                select: {
                    status: true,
                    late: true,
                    completedAt: true,
                    completedById: true,
                    completedBy: { select: { id: true, name: true } }
                }
            }
        },
        orderBy: [{ scheduledDate: 'desc' }, { dueAt: 'desc' }]
    })

    const instances = rows.filter((row) => canSeeInstance(actor, row, visibleUserIds, locationIds))
    const now = new Date()

    const summary = emptyCounts()
    const byEmployee = new Map()
    const byLocation = new Map()
    const byDate = new Map(span.map((day) => [day, emptyCounts()]))
    const history = []
    const filterLocations = new Map()

    const creditEmployee = (user, outcome) => {
        if (!user?.id) return
        if (visibleUserIds && !visibleUserIds.has(user.id)) return
        if (!byEmployee.has(user.id)) {
            byEmployee.set(user.id, { id: user.id, name: user.name, role: user.role, ...emptyCounts() })
        }
        bump(byEmployee.get(user.id), outcome)
    }

    for (const instance of instances) {
        if (instance.location) {
            filterLocations.set(instance.location.id, instance.location)
        }
        const outcome = classifyInstance(instance, now)
        if (!outcome) continue

        bump(summary, outcome)
        if (byDate.has(instance.scheduledDate)) bump(byDate.get(instance.scheduledDate), outcome)

        if (!byLocation.has(instance.locationId)) {
            byLocation.set(instance.locationId, {
                id: instance.locationId,
                name: instance.location?.name || 'Unknown',
                ...emptyCounts()
            })
        }
        bump(byLocation.get(instance.locationId), outcome)

        const assignees = (instance.template?.assignees || [])
            .map((row) => row.user)
            .filter(Boolean)
        const visibleAssignees = actor.role === 'user' ? assignees.filter((user) => user.id === actor.id) : assignees
        const completerIds = completerIdsOf(instance)
        visibleAssignees.forEach((user) => creditEmployee(user, employeeOutcome(user, outcome, completerIds)))

        if (history.length < 80 && outcome !== 'open') {
            history.push({
                id: instance.id,
                date: instance.scheduledDate,
                title: instance.template?.title || 'Task',
                location: instance.location?.name || '—',
                outcome,
                assignees: assignees.map((user) => user.name),
                completedBy: completerNamesOf(instance)
            })
        }
    }

    const scope = actor.role === 'admin' ? 'company' : actor.role === 'manager' ? 'team' : 'self'

    const sortMissedLate = (a, b) => b.missedLatePct - a.missedLatePct || b.scored - a.scored || a.name.localeCompare(b.name)
    const sortName = (a, b) => a.name.localeCompare(b.name)

    let filterLocationList = [...filterLocations.values()]
    if (actor.role === 'admin') {
        filterLocationList = await prisma.location.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } })
    } else if (actor.role === 'manager') {
        filterLocationList = await prisma.location.findMany({
            where: { id: { in: locationIds.length ? locationIds : ['__none__'] } },
            select: { id: true, name: true },
            orderBy: { name: 'asc' }
        })
    }

    return {
        scope,
        from,
        to,
        locationId: locationId || null,
        summary: rates(summary),
        trend: span.map((date) => ({ date, ...rates(byDate.get(date) || emptyCounts()) })),
        employees: [...byEmployee.values()].map(rates).sort(sortName),
        locations: [...byLocation.values()].map(rates).sort(sortMissedLate),
        history,
        filters: {
            locations: filterLocationList.sort((a, b) => a.name.localeCompare(b.name))
        }
    }
}

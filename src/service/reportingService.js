import prisma from '../config/prisma.js'

export const getDescendantIds = async (userId) => {
    const ids = []
    let frontier = [userId]

    while (frontier.length) {
        const reports = await prisma.user.findMany({
            where: { reportsToId: { in: frontier } },
            select: { id: true }
        })
        frontier = reports.map((row) => row.id).filter((id) => !ids.includes(id))
        ids.push(...frontier)
    }

    return ids
}

export const isInTeam = async (actorId, targetId) => {
    if (actorId === targetId) return true
    const descendants = await getDescendantIds(actorId)
    return descendants.includes(targetId)
}

export const allowedReportsToRoles = (role) => {
    if (role === 'admin') return ['admin']
    if (role === 'manager') return ['admin']
    return ['admin', 'manager']
}

export const validateReportsTo = async ({ role, reportsToId }) => {
    if (!reportsToId) {
        return { error: 'Reporting manager is required' }
    }

    const manager = await prisma.user.findUnique({ where: { id: reportsToId } })
    if (!manager) {
        return { error: 'Reporting manager not found' }
    }

    const allowed = allowedReportsToRoles(role)
    if (!allowed.includes(manager.role)) {
        return { error: `This role must report to: ${allowed.join(' or ')}` }
    }

    return { reportsToId: manager.id, manager }
}

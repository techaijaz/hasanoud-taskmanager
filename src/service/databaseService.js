import prisma from '../config/prisma.js'

const userPublicSelect = {
    id: true,
    name: true,
    email: true,
    role: true,
    canManageUsers: true,
    permissionOverrides: true,
    reportsToId: true,
    phoneIsoCode: true,
    phoneCountryCode: true,
    phoneInternationalNumber: true,
    timezone: true,
    theme: true,
    accountConfirmationStatus: true,
    lastLoginAt: true,
    createdAt: true,
    updatedAt: true,
    reportsTo: {
        select: { id: true, name: true, role: true, email: true }
    },
    locations: {
        select: {
            location: {
                select: { id: true, name: true, address: true }
            }
        }
    }
}

const mapUser = (user) => {
    if (!user) return user
    return {
        ...user,
        locations: (user.locations || []).map((row) => row.location)
    }
}

export default {
    connect: async () => {
        try {
            await prisma.$connect()
            return prisma
        } catch (error) {
            throw error
        }
    },
    findUserByEmail: (email) => {
        return prisma.user.findUnique({
            where: { email }
        })
    },
    findUserByPhone: (phoneCountryCode, phoneInternationalNumber) => {
        return prisma.user.findUnique({
            where: {
                phoneCountryCode_phoneInternationalNumber: {
                    phoneCountryCode,
                    phoneInternationalNumber
                }
            }
        })
    },
    findUserById: (id) => {
        return prisma.user.findUnique({
            where: { id }
        })
    },
    findUserPublicById: async (id) => {
        const user = await prisma.user.findUnique({
            where: { id },
            select: userPublicSelect
        })
        return mapUser(user)
    },
    registerUser: (userData) => {
        return prisma.user.create({
            data: userData
        })
    },
    findUserByConfirmationTokenAndCode: (token, code) => {
        return prisma.user.findFirst({
            where: {
                accountConfirmationToken: token,
                accountConfirmationCode: code
            }
        })
    },
    findUserByPasswordResetToken: (token) => {
        return prisma.user.findFirst({
            where: {
                passwordResetToken: token
            }
        })
    },
    updateUser: (id, data) => {
        return prisma.user.update({
            where: { id },
            data
        })
    },
    deleteUser: (id) => {
        return prisma.user.delete({
            where: { id }
        })
    },
    countDirectReports: (id) => {
        return prisma.user.count({
            where: { reportsToId: id }
        })
    },
    listUsers: async (where = {}) => {
        const users = await prisma.user.findMany({
            where,
            select: userPublicSelect,
            orderBy: { createdAt: 'desc' }
        })
        return users.map(mapUser)
    },
    setUserLocations: async (userId, locationIds) => {
        await prisma.userLocation.deleteMany({ where: { userId } })
        if (!locationIds?.length) return
        await prisma.userLocation.createMany({
            data: locationIds.map((locationId) => ({ userId, locationId }))
        })
    },
    deleteRefreshToken: (token) => {
        return prisma.user.updateMany({
            where: { refreshToken: token },
            data: { refreshToken: null }
        })
    },
    getRefreshToken: (token) => {
        return prisma.user.findFirst({
            where: { refreshToken: token }
        })
    },
    listLocations: () => {
        return prisma.location.findMany({
            orderBy: { name: 'asc' }
        })
    },
    findLocationById: (id) => {
        return prisma.location.findUnique({ where: { id } })
    },
    createLocation: (data) => {
        return prisma.location.create({ data })
    },
    updateLocation: (id, data) => {
        return prisma.location.update({ where: { id }, data })
    },
    deleteLocation: (id) => {
        return prisma.location.delete({ where: { id } })
    },
    getUserLocationIds: async (userId) => {
        const rows = await prisma.userLocation.findMany({
            where: { userId },
            select: { locationId: true }
        })
        return rows.map((row) => row.locationId)
    },
    listHolidays: (where) => {
        return prisma.holiday.findMany({
            where,
            include: { location: { select: { id: true, name: true } } },
            orderBy: [{ date: 'asc' }, { createdAt: 'asc' }]
        })
    },
    findHolidayById: (id) => {
        return prisma.holiday.findUnique({
            where: { id },
            include: { location: { select: { id: true, name: true } } }
        })
    },
    findHolidayByLocationDate: (locationId, date) => {
        if (!locationId) {
            return prisma.holiday.findFirst({
                where: { date, location: { is: null } }
            })
        }
        return prisma.holiday.findUnique({
            where: { locationId_date: { locationId, date } }
        })
    },
    createHoliday: (data) => {
        return prisma.holiday.create({
            data,
            include: { location: { select: { id: true, name: true } } }
        })
    },
    deleteHoliday: (id) => {
        return prisma.holiday.delete({ where: { id } })
    }
}

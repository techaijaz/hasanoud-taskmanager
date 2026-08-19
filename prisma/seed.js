/* eslint-disable no-console */
import 'dotenv-flow/config'
import bcrypt from 'bcrypt'
import { v4 as uuidv4 } from 'uuid'
import prisma from '../src/config/prisma.js'
import rbacService from '../src/service/rbacService.js'
import quiker from '../src/util/quiker.js'

const parsed = quiker.parsePhoneNumber('+919999999999')
const ADMIN = {
    name: 'Admin',
    email: 'admin@taskmanager.local',
    password: 'Admin@123',
    phoneIsoCode: parsed.isoCode || 'IN',
    phoneCountryCode: parsed.countryCode || '91',
    phoneInternationalNumber: parsed.internationalNumber || '+91 99999 99999',
    timezone: 'Asia/Kolkata',
    role: 'admin',
    canManageUsers: true,
    consent: true,
    accountConfirmationStatus: true
}

async function main() {
    const passwordHash = await bcrypt.hash(ADMIN.password, 10)
    const token = uuidv4()
    const code = String(Math.floor(100000 + Math.random() * 900000))

    const user = await prisma.user.upsert({
        where: { email: ADMIN.email },
        update: {
            name: ADMIN.name,
            password: passwordHash,
            role: ADMIN.role,
            canManageUsers: ADMIN.canManageUsers,
            accountConfirmationStatus: true,
            consent: true,
            reportsToId: null
        },
        create: {
            name: ADMIN.name,
            email: ADMIN.email,
            phoneIsoCode: ADMIN.phoneIsoCode,
            phoneCountryCode: ADMIN.phoneCountryCode,
            phoneInternationalNumber: ADMIN.phoneInternationalNumber,
            timezone: ADMIN.timezone,
            password: passwordHash,
            role: ADMIN.role,
            canManageUsers: ADMIN.canManageUsers,
            consent: ADMIN.consent,
            accountConfirmationStatus: ADMIN.accountConfirmationStatus,
            accountConfirmationToken: token,
            accountConfirmationCode: code,
            accountConfirmationTimestamp: new Date(),
            passwordResetToken: token,
            passwordResetExpiry: null,
            passwordResetLastResetAt: null,
            refreshToken: null,
            lastLoginAt: null,
            reportsToId: null
        }
    })

    const defaultLocations = [
        { name: 'Lucknow Warehouse', address: 'Lucknow' },
        { name: 'Lucknow Shop', address: 'Lucknow' },
        { name: 'Mumbai Shop', address: 'Mumbai' }
    ]
    for (const loc of defaultLocations) {
        const existing = await prisma.location.findFirst({ where: { name: loc.name } })
        if (!existing) {
            await prisma.location.create({ data: loc })
        }
    }

    await rbacService.ensureDefaultRolePermissions()
    const matrix = await rbacService.getRolePermissionMatrix({ force: true })

    console.log('Admin user ready:')
    console.log(`  email:    ${ADMIN.email}`)
    console.log(`  phone:    ${ADMIN.phoneCountryCode}${ADMIN.phoneInternationalNumber.replace(/\D/g, '').slice(-10)}`)
    console.log(`  password: ${ADMIN.password}`)
    console.log(`  id:       ${user.id}`)
    console.log(`  role:     ${user.role}`)
    console.log('RBAC matrix seeded for roles:', Object.keys(matrix).join(', '))
}

main()
    .catch((err) => {
        console.error('Seed failed:', err)
        process.exitCode = 1
    })
    .finally(async () => {
        await prisma.$disconnect()
    })

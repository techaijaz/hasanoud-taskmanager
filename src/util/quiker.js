import os from 'os'
import config from '../config/config.js'
import { parsePhoneNumberWithError } from 'libphonenumber-js'
import { getTimezonesForCountry } from 'countries-and-timezones'
import bcrypt from 'bcrypt'
import { v4 } from 'uuid'
import { randomInt } from 'crypto'
import jwt from 'jsonwebtoken'
import dayjs from 'dayjs'

export default {
    getSystemHealth: () => {
        return {
            cpuUsage: os.loadavg(),
            totalMemory: `${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB ${(((os.totalmem() - os.freemem()) / os.totalmem()) * 100).toFixed(2)} %`,
            freeMemory: `${(os.freemem() / 1024 / 1024 / 1024).toFixed(2)} GB`,
            usedMemory: `${((os.totalmem() - os.freemem()) / 1024 / 1024 / 1024).toFixed(2)} GB`
        }
    },
    getApplicationHealth: () => {
        return {
            environment: config.ENV,
            uptime: `${process.uptime().toFixed(2)} seconds`,
            memoryUsage: {
                heapTotal: `${(process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2)} MB`,
                heapUsed: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`
            }
        }
    },
    parsePhoneNumber: (phoneNumber) => {
        try {
            const parsedPhoneNumber = parsePhoneNumberWithError(phoneNumber)
            if (parsedPhoneNumber) {
                return {
                    countryCode: parsedPhoneNumber.countryCallingCode,
                    isoCode: parsedPhoneNumber.country,
                    internationalNumber: parsedPhoneNumber.formatInternational()
                }
            }
            return {
                countryCode: null,
                isoCode: null,
                internationalNumber: null
            }
        } catch (error) {
            return {
                countryCode: null,
                isoCode: null,
                internationalNumber: null
            }
        }
    },
    countryTimezone: (isoCode) => {
        return getTimezonesForCountry(isoCode)
    },
    hashedPassword: (password) => {
        return bcrypt.hash(password, 10)
    },
    comparePassword: (password, hashedPassword) => {
        return bcrypt.compare(password, hashedPassword)
    },
    generateRandomId: () => v4(),
    generateOtp: (length) => {
        const min = Math.pow(10, length - 1)
        const max = Math.pow(10, length) - 1
        return randomInt(min, max).toString()
    },
    generateToken: (payload, secret, expiry) => {
        return jwt.sign(payload, secret, { expiresIn: expiry })
    },
    verifyToken: (token, secret) => {
        return jwt.verify(token, secret)
    },
    getDomainFromUrl: (requesturl) => {
        try {
            const url = new URL(requesturl, config.SERVER_URL)
            return url.hostname
        } catch (error) {
            throw error
        }
    },
    authCookieOptions: (maxAge) => {
        const isProd = config.ENV === 'production'
        const options = {
            path: '/api/v1',
            sameSite: isProd ? 'strict' : 'lax',
            httpOnly: true,
            secure: isProd
        }
        if (typeof maxAge === 'number') {
            options.maxAge = maxAge
        }
        try {
            const domain = new URL(config.SERVER_URL).hostname
            if (domain && domain !== 'localhost' && domain !== '127.0.0.1') {
                options.domain = domain
            }
        } catch {
            // host-only cookie
        }
        return options
    },
    generateResetPasswordExpiry: (minute) => {
        return dayjs().valueOf() + minute * 60 * 1000
    }
}

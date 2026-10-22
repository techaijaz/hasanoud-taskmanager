import { jest, describe, test, expect, afterEach, afterAll } from '@jest/globals'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import app from '../src/app.js'
import config from '../src/config/config.js'
import prisma from '../src/config/prisma.js'
import logger from '../src/util/logger.js'
import requestPath from '../src/util/requestPath.js'
import errorObject from '../src/util/errorObject.js'
import systemLogService from '../src/service/systemLogService.js'
import { byUserOrIp } from '../src/middleware/rateLimit.js'

describe('Logging and rate-limit keys', () => {
    afterEach(() => {
        jest.restoreAllMocks()
    })

    afterAll(async () => {
        await prisma.$disconnect()
    })

    test('log path drops the query and masks one-time tokens', () => {
        expect(requestPath({ originalUrl: '/api/v1/reset-password/abc123?x=1' })).toBe('/api/v1/reset-password/:token')
        expect(requestPath({ originalUrl: '/api/v1/confirmation/xyz' })).toBe('/api/v1/confirmation/:token')
        expect(requestPath({ originalUrl: '/api/v1/users/42?page=2' })).toBe('/api/v1/users/42')
    })

    test('rate-limit key is the user when the access token is valid, else the IP', () => {
        config.ACCESS_TOKEN.SECRET = 'test-secret'
        const token = jwt.sign({ userId: 'u1' }, 'test-secret')
        expect(byUserOrIp({ ip: '1.2.3.4', cookies: { accessToken: token } })).toBe('user:u1')
        expect(byUserOrIp({ ip: '1.2.3.4', cookies: { accessToken: 'forged' } })).toBe('ip:1.2.3.4')
        expect(byUserOrIp({ ip: '1.2.3.4', cookies: {} })).toBe('ip:1.2.3.4')
    })

    test('a DB failure while recording never throws and falls back to the file log', async () => {
        jest.spyOn(prisma.systemLog, 'create').mockRejectedValue(new Error('db down'))
        const warn = jest.spyOn(logger, 'warn').mockImplementation(() => logger)
        await expect(systemLogService.record({ event: 'server_error', message: 'boom' })).resolves.toBeUndefined()
        expect(warn).toHaveBeenCalledWith('SYSTEM_LOG_WRITE_FAILED', expect.anything())
    })

    test('every response carries a request id', async () => {
        const response = await request(app).get('/api/v1/')
        expect(response.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/)
    })

    test('403 and 5xx errors are recorded, other 4xx are not', () => {
        const record = jest.spyOn(systemLogService, 'record').mockResolvedValue()
        const req = { id: 'r1', method: 'GET', originalUrl: '/api/v1/rbac' }
        errorObject(new Error('denied'), req, 403)
        errorObject(new Error('boom'), req, 500)
        errorObject(new Error('bad input'), req, 422)
        expect(record.mock.calls.map(([arg]) => arg.event)).toEqual(['forbidden', 'server_error'])
    })

    test('error log lines mask one-time tokens in the URL', () => {
        const info = jest.spyOn(logger, 'info').mockImplementation(() => logger)
        errorObject(new Error('expired'), { method: 'PUT', originalUrl: '/api/v1/reset-password/secret-token' }, 400)
        expect(JSON.stringify(info.mock.calls)).not.toContain('secret-token')
    })

    test('system logs need a login', async () => {
        const response = await request(app).get('/api/v1/system-logs')
        expect(response.statusCode).toBe(401)
    })
})

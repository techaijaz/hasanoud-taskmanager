import { jest, describe, test, expect, afterAll, afterEach } from '@jest/globals'
import request from 'supertest'
import app from '../src/app.js'
import prisma from '../src/config/prisma.js'
import systemLogService from '../src/service/systemLogService.js'

describe('Base Routes', () => {
    afterAll(async () => {
        await prisma.$disconnect()
    })
    afterEach(() => {
        jest.restoreAllMocks()
    })

    test('GET /api/v1/health is 200 when the DB answers, and shows no server internals', async () => {
        jest.spyOn(prisma, '$queryRaw').mockResolvedValue([{ 1: 1 }])
        const response = await request(app).get('/api/v1/health')
        expect(response.statusCode).toBe(200)
        expect(response.body.success).toBe(true)
        expect(response.body.data).toEqual({ database: 'ok' })
    })

    test('GET /api/v1/health is 503 when the DB is down', async () => {
        jest.spyOn(prisma, '$queryRaw').mockRejectedValue(new Error('ECONNREFUSED'))
        jest.spyOn(systemLogService, 'record').mockResolvedValue()
        const response = await request(app).get('/api/v1/health')
        expect(response.statusCode).toBe(503)
        expect(response.body.success).toBe(false)
    })
    test('GET / should return 200 and server running message', async () => {
        const response = await request(app).get('/')
        expect(response.statusCode).toBe(200)
        expect(response.body).toEqual({ message: 'Server is running!' })
    })

    test('GET /api/v1/ should return 200 and API working message', async () => {
        const response = await request(app).get('/api/v1/')
        expect(response.statusCode).toBe(200)
        expect(response.body).toEqual({ message: 'API is working!' })
    })

    test('GET /non-existent-route should return 404', async () => {
        const response = await request(app).get('/non-existent-route')
        expect(response.statusCode).toBe(404)
        expect(response.body.success).toBe(false)
    })
})

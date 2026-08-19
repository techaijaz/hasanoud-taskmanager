import { describe, test, expect, afterAll } from '@jest/globals'
import request from 'supertest'
import app from '../src/app.js'
import prisma from '../src/config/prisma.js'

describe('Base Routes', () => {
    afterAll(async () => {
        await prisma.$disconnect()
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

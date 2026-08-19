import { jest, describe, test, expect, beforeEach, afterAll } from '@jest/globals'
import request from 'supertest'
import app from '../src/app.js'
import databaseService from '../src/service/databaseService.js'
import prisma from '../src/config/prisma.js'

describe('User Authentication API', () => {
    let findUserSpy

    beforeEach(() => {
        jest.clearAllMocks()
        // Use spyOn instead of jest.mock for ESM compatibility in this setup
        findUserSpy = jest.spyOn(databaseService, 'findUserByEmail')
    })

    afterAll(async () => {
        jest.restoreAllMocks()
        await prisma.$disconnect()
    })

    describe('POST /api/v1/register', () => {
        test('should reject public signup', async () => {
            const response = await request(app).post('/api/v1/register').send({
                name: 'Test User',
                email: 'test@example.com',
                phone: '911234567890',
                password: 'password123',
                consent: true
            })

            expect(response.statusCode).toBe(403)
            expect(response.body.success).toBe(false)
        })
    })

    describe('POST /api/v1/login', () => {
        test('should return 404 for non-existent user', async () => {
            findUserSpy.mockResolvedValue(null)

            const response = await request(app).post('/api/v1/login').send({ email: 'wrong@example.com', password: 'password123' })

            expect(response.statusCode).toBe(404)
        })
    })
})

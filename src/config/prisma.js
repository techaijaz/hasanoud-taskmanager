import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import config from './config.js'

const connectTimeout = Number(process.env.DB_CONNECT_TIMEOUT_MS) || 30000

const adapter = new PrismaMariaDb({
    host: config.DB.HOST,
    port: parseInt(String(config.DB.PORT), 10),
    user: config.DB.USER,
    password: config.DB.PASSWORD,
    database: config.DB.NAME,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 5,
    queueLimit: 50,
    connectTimeout,
    acquireTimeout: connectTimeout + 5000,
    // MySQL 8 users with caching_sha2_password need the server's RSA key for a full
    // (non-cached) password login over plain TCP — e.g. right after MySQL restarts.
    // Without this every connect fails until the pool times out (crash loop under PM2).
    allowPublicKeyRetrieval: true
})

const prisma = new PrismaClient({ adapter })

export default prisma



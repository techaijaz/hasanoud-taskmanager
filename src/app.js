import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import router from './router/apiRouter.js'
import globalErrorHandler, { notFoundError } from './middleware/globalErrorHandler.js'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import config from './config/config.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

// Middlewares
app.use(helmet())
app.use(cookieParser())
app.use(
    cors({
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
        origin: (origin, callback) => {
            const allowed = (config.FRONTEND_URL || 'http://localhost:5173')
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean)
            if (!origin || allowed.includes(origin)) {
                return callback(null, true)
            }
            return callback(new Error('Not allowed by CORS'))
        },
        credentials: true
    })
)
app.use(express.json())
app.use(express.static(path.join(__dirname, '../', 'public')))
app.use(
    '/uploads',
    express.static(path.join(__dirname, '../uploads'), {
        setHeaders: (res) => {
            res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
        }
    })
)

// Routes
app.get('/', (req, res) => {
    res.status(200).json({ message: 'Server is running!' })
})
app.use('/api/v1', router)

// Chrome / Cursor DevTools probe this Chrome-debug URL; it is not an app route
app.get(['/json', '/json/version', '/json/list'], (_req, res) => {
    res.status(404).end()
})

// 404 Error handler
app.use(notFoundError)

// Global Error handler
app.use(globalErrorHandler)

export default app

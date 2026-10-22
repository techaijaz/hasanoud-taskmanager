import dotenvFlow from 'dotenv-flow'

// silent: in Docker the env comes from the container, so a missing .env file is expected
dotenvFlow.config({ silent: true })

// Express "trust proxy": hop count, true/false, or a list like "loopback, 10.0.0.0/8".
// Default trusts only a reverse proxy on the same host (e.g. nginx on 127.0.0.1).
const parseTrustProxy = (value) => {
    if (value === undefined || value === '') return 'loopback'
    if (value === 'true') return true
    if (value === 'false') return false
    if (/^\d+$/.test(value)) return Number(value)
    return value
}

const cloudinaryConfigured = Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)

export default {
    // General
    ENV: process.env.NODE_ENV,
    PORT: process.env.PORT || 8080,
    SERVER_URL: process.env.SERVER_URL,
    TRUST_PROXY: parseTrustProxy(process.env.TRUST_PROXY),

    // Database
    DB: {
        HOST: process.env.DB_HOST || 'localhost',
        PORT: process.env.DB_PORT || 3306,
        USER: process.env.DB_USER || 'root',
        PASSWORD: process.env.DB_PASSWORD || '',
        NAME: process.env.DB_NAME || 'auth_system'
    },

    // Frontend
    FRONTEND_URL: process.env.FRONTEND_URL,

    // Email service — set EMAIL_PROVIDER to "smtp" or "resend"
    EMAIL_PROVIDER: process.env.EMAIL_PROVIDER || 'smtp',
    EMAIL_SERVICE_API_KEY: process.env.EMAIL_SERVICE_API_KEY,
    RESEND_FROM: process.env.RESEND_FROM || 'onboarding@resend.dev',
    SMTP: {
        HOST: process.env.SMTP_HOST || 'smtp.hostinger.com',
        PORT: Number(process.env.SMTP_PORT) || 465,
        USER: process.env.SMTP_USER,
        PASS: process.env.SMTP_PASS,
        FROM: process.env.SMTP_FROM
    },

    // Access Token
    ACCESS_TOKEN: {
        SECRET: process.env.ACCESS_TOKEN_SECRET,
        EXPIRY: 3600
    },

    // Refresh Token
    REFRESH_TOKEN: {
        SECRET: process.env.REFRESH_TOKEN_SECRET,
        EXPIRY: 3600 * 24
    },

    // Uploads — UPLOAD_PROVIDER: local | cloudinary
    UPLOAD_PROVIDER: process.env.UPLOAD_PROVIDER || (cloudinaryConfigured ? 'cloudinary' : 'local'),
    CLOUDINARY: {
        CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
        API_KEY: process.env.CLOUDINARY_API_KEY,
        API_SECRET: process.env.CLOUDINARY_API_SECRET,
        FOLDER: process.env.CLOUDINARY_FOLDER || 'task-proofs'
    }
}

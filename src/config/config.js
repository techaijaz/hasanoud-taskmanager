import dotenvFlow from 'dotenv-flow'

dotenvFlow.config()

export default {
    // General
    ENV: process.env.NODE_ENV,
    PORT: process.env.PORT || 8080,
    SERVER_URL: process.env.SERVER_URL,

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

    // Email service
    EMAIL_SERVICE_API_KEY: process.env.EMAIL_SERVICE_API_KEY,

    // Access Token
    ACCESS_TOKEN: {
        SECRET: process.env.ACCESS_TOKEN_SECRET,
        EXPIRY: 3600
    },

    // Refresh Token
    REFRESH_TOKEN: {
        SECRET: process.env.REFRESH_TOKEN_SECRET,
        EXPIRY: 3600 * 24
    }
}

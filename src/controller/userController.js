import httpResponse from '../util/httpResponse.js'
import responceMessage from '../constant/responseMessage.js'
import httpError from '../util/httpError.js'
import {
    validateJoiSchema,
    validationLoginBody,
    validationForgotPasswordBody,
    validationResetPasswordBody,
    validationChangePasswordBody,
    validationThemeBody
} from '../service/validationService.js'
import quiker from '../util/quiker.js'
import databaseService from '../service/databaseService.js'

import emailService from '../service/emailService.js'
import logger from '../util/logger.js'
import config from '../config/config.js'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
import rbacService from '../service/rbacService.js'
dayjs.extend(utc)

const resolveLoginUser = async ({ email, phone }) => {
    if (email) {
        return databaseService.findUserByEmail(email)
    }
    const trimmed = String(phone).trim()
    const digits = trimmed.replace(/\D/g, '')
    const withPlus = trimmed.startsWith('+') ? trimmed : digits.length === 10 ? `+91${digits}` : `+${digits}`
    const { countryCode, internationalNumber } = quiker.parsePhoneNumber(withPlus)
    if (!countryCode || !internationalNumber) {
        return null
    }
    return databaseService.findUserByPhone(countryCode, internationalNumber)
}

export default {
    register: async (req, res) => {
        res.status(403).json({
            success: false,
            statusCode: 403,
            request: { method: req.method, url: req.originalUrl },
            message: 'Public signup is disabled. Contact an administrator to create an account.',
            data: null
        })
    },
    confirmation: async (req, res, next) => {
        try {
            const { params, query } = req
            
            // * confirm user by token and code
            const user = await databaseService.findUserByConfirmationTokenAndCode(params.token, query.code)
            if (!user) {
                return httpError(next, new Error(responceMessage.INVALID_ACCOUNT_CONFIRMATION_TOKEN_OR_CODE), req, 422)
            }

            //  * account is already confirmed
            if (user.accountConfirmationStatus) {
                return httpError(next, new Error(responceMessage.ACCOUNT_ALREADY_CONFIRMED), req, 422)
            }

            // * confirm user
            await databaseService.updateUser(user.id, {
                accountConfirmationStatus: true,
                accountConfirmationTimestamp: dayjs().utc().toDate()
            })

            // * send confirmation email
            const to = [user.email]
            const subject = 'Account Confirmed'
            const text = `Hey ${user.name}, Your account has been successfully confirmed.\n\n`
            emailService.sendEmail(to, subject, text).catch((error) => logger.error('EMAIL_SERVICE', { meta: error }))
            httpResponse(req, res, 200, responceMessage.SUCCESS, {
                params
            })
        } catch (error) {
            httpError(next, error, req, 500)
        }
    },
    login: async (req, res, next) => {
        try {
            const { body } = req
            const { error, value } = validateJoiSchema(validationLoginBody, body)
            if (error) {
                return httpError(next, error, req, 422)
            }

            const { email, phone, password } = value
            const user = await resolveLoginUser({ email, phone })
            
            // * validate password
            if (!user) {
                return httpError(next, new Error(responceMessage.NOT_FOUND('User')), req, 404)
            }
            const isPasswordMatch = await quiker.comparePassword(password, user.password)
            if (!isPasswordMatch) {
                return httpError(next, new Error(responceMessage.INVALID_CREDENTIALS), req, 404)
            }
            
            // * generate token
            const accessToken = quiker.generateToken(
                { userId: user.id, role: user.role },
                config.ACCESS_TOKEN.SECRET,
                config.ACCESS_TOKEN.EXPIRY
            )

            const refreshToken = quiker.generateToken(
                { userId: user.id, role: user.role },
                config.REFRESH_TOKEN.SECRET,
                config.REFRESH_TOKEN.EXPIRY
            )
            
            // * update last login and refresh token
            await databaseService.updateUser(user.id, {
                lastLoginAt: dayjs().utc().toDate(),
                refreshToken: refreshToken
            })

            // * cookie send
            res.cookie('accessToken', accessToken, quiker.authCookieOptions(1000 * config.ACCESS_TOKEN.EXPIRY)).cookie(
                'refreshToken',
                refreshToken,
                quiker.authCookieOptions(1000 * config.REFRESH_TOKEN.EXPIRY)
            )
            
            httpResponse(req, res, 200, responceMessage.SUCCESS, {
                accessToken,
                refreshToken
            })
        } catch (error) {
            httpError(next, error, req, 500)
        }
    },
    selfIdentification: async (req, res, next) => {
        try {
            const { authenticatedUser } = req
            const safeUser = { ...authenticatedUser }
            delete safeUser.password
            delete safeUser.refreshToken
            delete safeUser.passwordResetToken
            delete safeUser.accountConfirmationToken
            delete safeUser.accountConfirmationCode

            const permissions = await rbacService.resolveUserPermissions(safeUser)

            httpResponse(req, res, 200, responceMessage.SUCCESS, {
                ...safeUser,
                permissions
            })
        } catch (error) {
            httpError(next, error, req, 500)
        }
    },
    logout: async (req, res, next) => {
        try {
            const { cookies } = req
            const { refreshToken } = cookies

            if (refreshToken) {
                await databaseService.deleteRefreshToken(refreshToken)
            }
            res.clearCookie('accessToken', quiker.authCookieOptions()).clearCookie('refreshToken', quiker.authCookieOptions())
            httpResponse(req, res, 200, responceMessage.SUCCESS, null)
        } catch (error) {
            httpError(next, error, req, 500)
        }
    },
    refreshToken: async (req, res, next) => {
        try {
            const { cookies } = req
            const { refreshToken, accessToken } = cookies

            if (accessToken) {
                return httpResponse(req, res, 200, responceMessage.SUCCESS, { accessToken })
            }
            if (refreshToken) {
                const user = await databaseService.getRefreshToken(refreshToken)
                if (user) {
                    let userId = null
                    let role = null
                    try {
                        const decryptedjwt = quiker.verifyToken(refreshToken, config.REFRESH_TOKEN.SECRET)
                        userId = decryptedjwt.userId
                        role = decryptedjwt.role
                    } catch {
                        userId = null
                    }

                    let newAccessToken = null
                    if (userId) {
                        newAccessToken = quiker.generateToken(
                            { userId, role },
                            config.ACCESS_TOKEN.SECRET,
                            config.ACCESS_TOKEN.EXPIRY
                        )
                        res.cookie('accessToken', newAccessToken, quiker.authCookieOptions(1000 * config.ACCESS_TOKEN.EXPIRY))
                    }
                    return httpResponse(req, res, 200, responceMessage.SUCCESS, { accessToken: newAccessToken })
                }
            }
            return httpError(next, new Error(responceMessage.UNAUTHORIZED), req, 401)
        } catch (error) {
            httpError(next, error, req, 500)
        }
    },
    forgotPassword: async (req, res, next) => {
        try {
            const { body } = req
            const { error, value } = validateJoiSchema(validationForgotPasswordBody, body)
            if (error) {
                return httpError(next, error, req, 422)
            }
            const { email } = value
            const user = await databaseService.findUserByEmail(email)
            if (!user) {
                return httpError(next, new Error(responceMessage.NOT_FOUND('User')), req, 404)
            }

            if (!user.accountConfirmationStatus) {
                return httpError(next, new Error(responceMessage.ACCOUNT_CONFIRMATION_REQUIRED), req, 400)
            }

            const token = quiker.generateRandomId()
            const expiry = quiker.generateResetPasswordExpiry(15)

            // * update user
            await databaseService.updateUser(user.id, {
                passwordResetToken: token,
                passwordResetExpiry: expiry
            })

            // * send email
            const resetlURL = `${config.FRONTEND_URL}/reset-password/${token}`
            const to = [email]
            const subject = 'Account Password Reset requested'
            const text = `Hey ${user.name}, Please reset your password by clicking on the link below.\n\nLink will expire in 15 minutes.\n\n${resetlURL}`

            emailService.sendEmail(to, subject, text).catch((error) => logger.error('EMAIL_SERVICE', { meta: error }))

            httpResponse(req, res, 200, responceMessage.SUCCESS, null)
        } catch (error) {
            httpError(next, error, req, 500)
        }
    },
    resetPassword: async (req, res, next) => {
        try {
            const { body, params } = req
            const { token } = params
            const { error, value } = validateJoiSchema(validationResetPasswordBody, body)
            if (error) {
                return httpError(next, error, req, 422)
            }
            const user = await databaseService.findUserByPasswordResetToken(token)
            if (!user) {
                return httpError(next, new Error(responceMessage.NOT_FOUND('User')), req, 404)
            }

            if (!user.accountConfirmationStatus) {
                return httpError(next, new Error(responceMessage.ACCOUNT_CONFIRMATION_REQUIRED), req, 400)
            }

            const { newPassword } = value

            const storedExpiry = user.passwordResetExpiry
            const currentExpiry = dayjs().valueOf()

            if (!storedExpiry) {
                return httpError(next, new Error(responceMessage.INVALID_REQUEST), req, 400)
            }
            if (currentExpiry > storedExpiry) {
                return httpError(next, new Error(responceMessage.PASSWORD_RESET_URL_EXPIRED), req, 400)
            }

            const hashedPassword = await quiker.hashedPassword(newPassword)

            // * update password reset token
            await databaseService.updateUser(user.id, {
                password: hashedPassword,
                passwordResetToken: '',
                passwordResetExpiry: null,
                passwordResetLastResetAt: dayjs().utc().toDate()
            })

            // * send email
            const to = [user.email]
            const subject = 'Reset account password'
            const text = `Hey ${user.name}, Your password has been successfully reset.`
            emailService.sendEmail(to, subject, text).catch((error) => {
                logger.error('EMAIL_SERVICE', { meta: error })
            })
            httpResponse(req, res, 200, responceMessage.SUCCESS, null)
        } catch (error) {
            httpError(next, error, req, 500)
        }
    },
    changePassword: async (req, res, next) => {
        try {
            const { body, authenticatedUser } = req
            const { error, value } = validateJoiSchema(validationChangePasswordBody, body)
            if (error) {
                return httpError(next, error, req, 422)
            }
            const { oldPassword, newPassword } = value

            const user = await databaseService.findUserById(authenticatedUser.id)
            if (!user) {
                return httpError(next, new Error(responceMessage.NOT_FOUND('User')), req, 404)
            }

            const isPasswordMatch = await quiker.comparePassword(oldPassword, user.password)
            if (!isPasswordMatch) {
                return httpError(next, new Error(responceMessage.INVALID_OLD_PASSWORD), req, 400)
            }

            if (newPassword === oldPassword) {
                return httpError(next, new Error(responceMessage.PASSWORD_MATCHING_WITH_OLD_PASSWORD), req, 400)
            }
            const hashedPassword = await quiker.hashedPassword(newPassword)
            await databaseService.updateUser(user.id, {
                password: hashedPassword
            })

            // * send email
            const to = [user.email]
            const subject = 'Password changed.'
            const text = `Hey ${user.name}, Your account password has been changed successfully.`
            emailService.sendEmail(to, subject, text).catch((error) => {
                logger.error('EMAIL_SERVICE', { meta: error })
            })
            httpResponse(req, res, 200, responceMessage.SUCCESS, null)
        } catch (error) {
            httpError(next, error, req, 500)
        }
    },
    updateTheme: async (req, res, next) => {
        try {
            const { error, value } = validateJoiSchema(validationThemeBody, req.body)
            if (error) {
                return httpError(next, error, req, 422)
            }

            await databaseService.updateUser(req.authenticatedUser.id, { theme: value.theme })
            const user = await databaseService.findUserPublicById(req.authenticatedUser.id)
            const permissions = await rbacService.resolveUserPermissions(user)

            httpResponse(req, res, 200, responceMessage.SUCCESS, {
                ...user,
                permissions
            })
        } catch (error) {
            httpError(next, error, req, 500)
        }
    }
}

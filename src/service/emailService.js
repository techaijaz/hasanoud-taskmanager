import nodemailer from 'nodemailer'
import { Resend } from 'resend'
import config from '../config/config.js'

const resend = new Resend(config.EMAIL_SERVICE_API_KEY || 're_dummy_key')

let smtpTransporter = null

const getProvider = () => String(config.EMAIL_PROVIDER || 'smtp').toLowerCase()

const normalizeRecipients = (to) => (Array.isArray(to) ? to : [to])

const toHtml = (text) => String(text).replace(/\n/g, '<br>')

const assertSmtpConfig = () => {
    const missing = []
    if (!config.SMTP.HOST) missing.push('SMTP_HOST')
    if (!config.SMTP.USER) missing.push('SMTP_USER')
    if (!config.SMTP.PASS) missing.push('SMTP_PASS')
    if (!config.SMTP.FROM) missing.push('SMTP_FROM')
    if (missing.length) {
        throw new Error(`SMTP email is not configured. Missing: ${missing.join(', ')}`)
    }
}

const assertResendConfig = () => {
    if (!config.EMAIL_SERVICE_API_KEY) {
        throw new Error('Resend email is not configured. Missing: EMAIL_SERVICE_API_KEY')
    }
    if (!config.RESEND_FROM) {
        throw new Error('Resend email is not configured. Missing: RESEND_FROM')
    }
}

const getSmtpTransporter = () => {
    assertSmtpConfig()
    if (!smtpTransporter) {
        smtpTransporter = nodemailer.createTransport({
            host: config.SMTP.HOST,
            port: config.SMTP.PORT,
            secure: config.SMTP.PORT === 465,
            auth: {
                user: config.SMTP.USER,
                pass: config.SMTP.PASS
            }
        })
    }
    return smtpTransporter
}

const sendViaResend = async (to, subject, text) => {
    assertResendConfig()
    const result = await resend.emails.send({
        from: config.RESEND_FROM,
        to: normalizeRecipients(to),
        subject,
        html: toHtml(text)
    })
    if (result?.error) {
        throw new Error(result.error.message || JSON.stringify(result.error))
    }
    return result
}

const sendViaSmtp = async (to, subject, text) => {
    const transporter = getSmtpTransporter()
    return transporter.sendMail({
        from: config.SMTP.FROM,
        to: normalizeRecipients(to),
        subject,
        text,
        html: toHtml(text)
    })
}

export default {
    sendEmail: async (to, subject, text) => {
        const provider = getProvider()
        if (provider === 'smtp') {
            return sendViaSmtp(to, subject, text)
        }
        if (provider === 'resend') {
            return sendViaResend(to, subject, text)
        }
        throw new Error(`Unknown EMAIL_PROVIDER "${config.EMAIL_PROVIDER}". Use "smtp" or "resend".`)
    }
}

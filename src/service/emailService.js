import { Resend } from 'resend'
import config from '../config/config.js'

const resend = new Resend(config.EMAIL_SERVICE_API_KEY || 're_dummy_key')


export default {
    sendEmail: async (to, subject, text) => {
        try {
            const result = await resend.emails.send({
                from: 'onboarding@resend.dev',
                to,
                subject,
                html: text
            })

            return result
        } catch (error) {
            throw error
        }
    }
}

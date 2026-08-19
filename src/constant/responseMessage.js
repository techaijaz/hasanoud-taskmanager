export default {
    SUCCESS: 'The opration has been successful',
    ERROR: 'The opration has an error',
    NOT_FOUND: (entity) => `${entity} not found`,
    TOO_MANY_REQUEST: 'Too many request please try again later',
    INCORECT_PHONE_NUMBER: 'Incorect phone number',
    ALREADY_EXIST: (entity, identifire) => {
        return `${entity} is already exist with ${identifire}`
    },
    INVALID_ACCOUNT_CONFIRMATION_TOKEN_OR_CODE: 'Invalid account confirmation token or code',
    ACCOUNT_ALREADY_CONFIRMED: 'Account already confirmed',
    INVALID_CREDENTIALS: 'Invalid email, phone, or password. Please try again.',
    UNAUTHORIZED: 'Unauthorized, please login first',
    ACCOUNT_CONFIRMATION_REQUIRED: 'Account confirmation required',
    PASSWORD_RESET_URL_EXPIRED: 'Password reset url expired',
    INVALID_REQUEST: 'Invalid request',
    INVALID_OLD_PASSWORD: 'Invalid old password',
    PASSWORD_MATCHING_WITH_OLD_PASSWORD: 'Password matching with old password'
}

import Joi from 'joi'

const email = () => Joi.string().email({ tlds: { allow: false } })

export const validationRegisterBody = Joi.object({
    name: Joi.string().required().min(3).max(72).trim(),
    email: email().required(),
    phone: Joi.string().min(4).max(20).required(),
    password: Joi.string().min(8).max(72).required().trim(),
    consent: Joi.boolean().required().valid(true)
})

export const validationLoginBody = Joi.object({
    email: email(),
    phone: Joi.string().min(4).max(20),
    password: Joi.string().min(8).max(72).required().trim()
}).or('email', 'phone')

const permissionOverrideRow = Joi.object({
    canView: Joi.boolean(),
    canCreate: Joi.boolean(),
    canEdit: Joi.boolean(),
    canDelete: Joi.boolean()
})

const roleSchema = Joi.string().valid('user', 'manager', 'admin').empty('').default('user')

export const validationCreateManagedUserBody = Joi.object({
    name: Joi.string().required().min(3).max(72).trim(),
    email: email().required(),
    phone: Joi.string().min(4).max(20).required(),
    role: roleSchema,
    reportsToId: Joi.string().uuid().allow(null, ''),
    locationIds: Joi.array().items(Joi.string().uuid()).default([]),
    canManageUsers: Joi.boolean().default(false),
    permissionOverrides: Joi.object().pattern(Joi.string(), permissionOverrideRow).allow(null)
})

export const validationUpdateManagedUserBody = Joi.object({
    name: Joi.string().min(3).max(72).trim(),
    email: email(),
    phone: Joi.string().min(4).max(20),
    role: Joi.string().valid('user', 'manager', 'admin').empty(''),
    reportsToId: Joi.string().uuid().allow(null, ''),
    locationIds: Joi.array().items(Joi.string().uuid()),
    canManageUsers: Joi.boolean(),
    permissionOverrides: Joi.object().pattern(Joi.string(), permissionOverrideRow).allow(null)
}).min(1)

export const validationLocationBody = Joi.object({
    name: Joi.string().required().min(2).max(120).trim(),
    address: Joi.string().max(255).allow('', null)
})

export const validationLocationUpdateBody = Joi.object({
    name: Joi.string().min(2).max(120).trim(),
    address: Joi.string().max(255).allow('', null)
}).min(1)

export const validationHolidayBody = Joi.object({
    locationId: Joi.string().uuid(),
    allLocations: Joi.boolean(),
    date: Joi.string()
        .pattern(/^\d{4}-\d{2}-\d{2}$/)
        .required(),
    description: Joi.string().trim().max(160).allow('', null).optional()
}).custom((value, helpers) => {
    if (value.allLocations === true) {
        return { ...value, locationId: undefined, allLocations: true }
    }
    if (!value.locationId) {
        return helpers.message('Pick a location or all locations')
    }
    return { ...value, allLocations: undefined }
})

const dueTime = Joi.string()
    .custom((value, helpers) => {
        const sliced = String(value || '').slice(0, 5)
        if (!/^\d{2}:\d{2}$/.test(sliced)) return helpers.error('any.invalid')
        const [hour, minute] = sliced.split(':').map(Number)
        if (hour > 23 || minute > 59) return helpers.error('any.invalid')
        return sliced
    })
    .required()

const weekdays = Joi.array().items(Joi.number().integer().min(0).max(6)).unique()

const subTask = Joi.object({
    id: Joi.string().uuid(),
    title: Joi.string().required().min(2).max(160).trim(),
    dueTime
})

export const validationTaskTemplateBody = Joi.object({
    title: Joi.string().required().min(2).max(160).trim(),
    locationId: Joi.string().uuid().required(),
    priority: Joi.string().valid('high', 'medium', 'low').default('medium'),
    kind: Joi.string().valid('one_time', 'recurring').required(),
    recurrence: Joi.string().valid('daily', 'weekly', 'custom').when('kind', {
        is: 'recurring',
        then: Joi.required(),
        otherwise: Joi.allow(null, '')
    }),
    weekdays: weekdays.when('recurrence', {
        is: Joi.valid('weekly', 'custom'),
        then: Joi.required(),
        otherwise: Joi.allow(null)
    }),
    scheduledDate: Joi.string()
        .pattern(/^\d{4}-\d{2}-\d{2}$/)
        .when('kind', {
            is: 'one_time',
            then: Joi.required(),
            otherwise: Joi.allow(null, '')
        }),
    assigneeIds: Joi.array().items(Joi.string().uuid()).default([]),
    skipOnHoliday: Joi.boolean().default(true),
    items: Joi.array().items(subTask).min(1).required()
})

export const validationTaskTemplateUpdateBody = Joi.object({
    title: Joi.string().min(2).max(160).trim(),
    locationId: Joi.string().uuid(),
    priority: Joi.string().valid('high', 'medium', 'low'),
    kind: Joi.string().valid('one_time', 'recurring'),
    recurrence: Joi.string().valid('daily', 'weekly', 'custom').allow(null, ''),
    weekdays: weekdays.allow(null),
    scheduledDate: Joi.string()
        .pattern(/^\d{4}-\d{2}-\d{2}$/)
        .allow(null, ''),
    assigneeIds: Joi.array().items(Joi.string().uuid()),
    items: Joi.array().items(subTask).min(1)
}).min(1)

export const validationSkipOnHolidayBody = Joi.object({
    skipOnHoliday: Joi.boolean().required()
})

export const validationInstanceSkipBody = Joi.object({
    skipOnHoliday: Joi.boolean().required()
})

export const validationBoardPlaceBody = Joi.object({
    x: Joi.number().min(0).max(92).required(),
    y: Joi.number().min(0).max(92).required(),
    z: Joi.number().integer().min(0).optional()
})

export const validationForgotPasswordBody = Joi.object({
    email: email().required()
})

export const validationResetPasswordBody = Joi.object({
    newPassword: Joi.string().min(8).max(72).required().trim()
})

export const validationChangePasswordBody = Joi.object({
    oldPassword: Joi.string().min(8).max(72).required().trim(),
    newPassword: Joi.string().min(8).max(72).required().trim()
})

export const validationThemeBody = Joi.object({
    theme: Joi.string().valid('light', 'dark').required()
})

const ymd = Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/)

export const validationReportQuery = Joi.object({
    from: ymd.required(),
    to: ymd.required(),
    locationId: Joi.string().uuid().optional()
})

export const validateJoiSchema = (schema, value) => {
    const result = schema.validate(value)
    return {
        value: result.value,
        error: result.error?.message
    }
}

const IST_OFFSET_MS = 330 * 60 * 1000

export const todayIstYmd = () => {
    return new Date(Date.now() + IST_OFFSET_MS).toISOString().slice(0, 10)
}

export const istWallToUtc = (dateStr, timeStr) => {
    const [year, month, day] = String(dateStr).split('-').map(Number)
    const [hour, minute] = String(timeStr).split(':').map(Number)
    return new Date(Date.UTC(year, month - 1, day, hour, minute) - IST_OFFSET_MS)
}

export const addMinutes = (date, minutes) => new Date(date.getTime() + minutes * 60 * 1000)

export const isValidTime = (value) => {
    if (!/^\d{2}:\d{2}$/.test(value)) return false
    const [hour, minute] = value.split(':').map(Number)
    return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59
}

export const isValidYmd = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value)

export const weekdayOfYmd = (ymd) => {
    const [year, month, day] = String(ymd).split('-').map(Number)
    return new Date(Date.UTC(year, month - 1, day)).getUTCDay()
}

export const addDaysYmd = (ymd, days) => {
    const [year, month, day] = String(ymd).split('-').map(Number)
    return new Date(Date.UTC(year, month - 1, day + Number(days))).toISOString().slice(0, 10)
}

export const isSundayYmd = (ymd) => weekdayOfYmd(ymd) === 0

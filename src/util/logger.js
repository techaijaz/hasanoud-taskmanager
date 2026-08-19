import { createLogger, format, transports } from 'winston'
import util from 'util'
import config from '../config/config.js'
import { EApplicationEnvironment } from '../constant/application.js'
import path from 'path'
import { fileURLToPath } from 'url'
import { blue, green, magenta, red, yellow } from 'colorette'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const coloriseLevel = (level) => {
    switch (level) {
        case 'ERROR':
            return red(level)
        case 'INFO':
            return blue(level)
        case 'WARN':
            return yellow(level)
        default:
            return level
    }
}

const consoleFormate = format.printf((info) => {
    const { level, message, timestamp, meta } = info
    const customLevel = coloriseLevel(level.toUpperCase())
    const customTimestamp = green(timestamp)
    const customMeta = util.inspect(meta, {
        showHidden: false,
        depth: null,
        colors: true
    })

    const customLog = `${customLevel} [${customTimestamp}] ${message} \n ${magenta('META')} ${customMeta}\n`
    return customLog
})

const consoleTransport = () => {
    if (config.ENV === EApplicationEnvironment.DEVELOPMENT) {
        return [
            new transports.Console({
                level: 'info',
                format: format.combine(format.timestamp(), consoleFormate)
            })
        ]
    }
    return []
}

const fileFormate = format.printf((info) => {
    const { level, message, timestamp, meta } = info
    const logMeta = {}
    if (meta) {
        for (const [key, value] of Object.entries(meta)) {
            if (value instanceof Error) {
                logMeta[key] = {
                    name: value.name,
                    message: value.message,
                    stack: value.stack || null
                }
            } else {
                logMeta[key] = value
            }
        }
    }

    const logData = {
        level: level.toUpperCase(),
        message,
        timestamp,
        meta: logMeta
    }

    return JSON.stringify(logData, null, 4)
})

const fileTransport = () => {
    return [
        new transports.File({
            filename: path.join(__dirname, '../', '../', 'logs', `${config.ENV}.log`),
            level: 'info',
            format: format.combine(format.timestamp(), fileFormate)
        })
    ]
}

export default createLogger({
    defaultMeta: {
        meta: {}
    },
    transports: [...fileTransport(), ...consoleTransport()]
})

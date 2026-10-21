import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'
import config from '../config/config.js'

const uploadDir = path.join(process.cwd(), 'uploads', 'task-proofs')
const useLocalStorage = config.UPLOAD_PROVIDER === 'local'

if (useLocalStorage) {
    fs.mkdirSync(uploadDir, { recursive: true })
}

const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.gif']

const diskStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase()
        const safeExt = imageExtensions.includes(ext) ? ext : '.jpg'
        cb(null, `${uuidv4()}${safeExt}`)
    }
})

const storage = useLocalStorage ? diskStorage : multer.memoryStorage()

export const proofUpload = multer({
    storage,
    limits: { fileSize: 6 * 1024 * 1024, files: 5 },
    fileFilter: (_req, file, cb) => {
        if (!String(file.mimetype || '').startsWith('image/')) {
            return cb(new Error('Photos must be images'))
        }
        cb(null, true)
    }
})

export const localProofDir = uploadDir

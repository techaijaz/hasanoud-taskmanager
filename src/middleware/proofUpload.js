import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'

const uploadDir = path.join(process.cwd(), 'uploads', 'task-proofs')
fs.mkdirSync(uploadDir, { recursive: true })

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase()
        const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.gif'].includes(ext) ? ext : '.jpg'
        cb(null, `${uuidv4()}${safeExt}`)
    }
})

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

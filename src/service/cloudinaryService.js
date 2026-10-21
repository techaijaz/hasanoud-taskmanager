import { v2 as cloudinary } from 'cloudinary'
import fs from 'fs/promises'
import path from 'path'
import config from '../config/config.js'

let configured = false

const ensureConfigured = () => {
    const { CLOUD_NAME, API_KEY, API_SECRET } = config.CLOUDINARY
    const missing = []
    if (!CLOUD_NAME) missing.push('CLOUDINARY_CLOUD_NAME')
    if (!API_KEY) missing.push('CLOUDINARY_API_KEY')
    if (!API_SECRET) missing.push('CLOUDINARY_API_SECRET')
    if (missing.length) {
        throw new Error(`Cloudinary is not configured. Missing: ${missing.join(', ')}`)
    }
    if (!configured) {
        cloudinary.config({
            cloud_name: CLOUD_NAME,
            api_key: API_KEY,
            api_secret: API_SECRET,
            secure: true
        })
        configured = true
    }
}

export const isCloudinaryConfigured = () => {
    const { CLOUD_NAME, API_KEY, API_SECRET } = config.CLOUDINARY
    return Boolean(CLOUD_NAME && API_KEY && API_SECRET)
}

export const uploadImage = async (buffer, options = {}) => {
    ensureConfigured()
    const { folder = 'task-proofs', ...uploadOptions } = options

    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: 'image',
                ...uploadOptions
            },
            (error, result) => {
                if (error) {
                    reject(error)
                    return
                }
                resolve(result)
            }
        )
        stream.end(buffer)
    })
}

export const destroyImage = async (publicId) => {
    if (!publicId) {
        return null
    }
    if (publicId.startsWith('local:')) {
        const filename = publicId.slice('local:'.length)
        const filePath = path.join(process.cwd(), 'uploads', 'task-proofs', filename)
        try {
            await fs.unlink(filePath)
        } catch (error) {
            if (error?.code !== 'ENOENT') throw error
        }
        return null
    }
    ensureConfigured()
    return cloudinary.uploader.destroy(publicId, { resource_type: 'image' })
}

export const destroyProofImages = async (publicIds) => {
    const unique = [...new Set((publicIds || []).filter(Boolean))]
    await Promise.allSettled(unique.map((publicId) => destroyImage(publicId)))
}

export default {
    isCloudinaryConfigured,
    uploadImage,
    destroyImage,
    destroyProofImages
}

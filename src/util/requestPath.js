// Path for logs: no query string, and one-time tokens in the URL are masked
export default (req) =>
    String(req.originalUrl || '')
        .split('?')[0]
        .replace(/\/(confirmation|reset-password)\/[^/]+/, '/$1/:token')
        .slice(0, 255)

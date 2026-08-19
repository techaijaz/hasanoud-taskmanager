import axios from 'axios'

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
})

let isRefreshing = false
let failedQueue = []

const AUTH_ROUTES = ['/login', '/forgot-password', '/reset-password']

const goLogin = () => {
  const path = window.location.pathname
  if (path === '/login' || path.startsWith('/forgot-password') || path.startsWith('/reset-password')) return
  window.location.href = '/login'
}

const isAuthRoute = (url = '') => AUTH_ROUTES.some((route) => url.includes(route))

const processQueue = (error) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error)
    else prom.resolve()
  })
  failedQueue = []
}

instance.interceptors.request.use((config) => {
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    if (config.headers && typeof config.headers.delete === 'function') {
      config.headers.delete('Content-Type')
    } else if (config.headers) {
      delete config.headers['Content-Type']
    }
  }
  return config
})

instance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && originalRequest) {
      if (isAuthRoute(originalRequest.url) || originalRequest.url?.includes('/refresh-token') || originalRequest._retry) {
        if (originalRequest.url?.includes('/refresh-token') || originalRequest._retry) {
          goLogin()
        }
        return Promise.reject(error)
      }

      originalRequest._retry = true

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(() => instance(originalRequest))
      }

      isRefreshing = true
      try {
        await instance.post('/refresh-token', {})
        processQueue(null)
        return instance(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError)
        goLogin()
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default instance

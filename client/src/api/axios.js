import axios from 'axios'

const RENDER_API_BASE_URL = 'https://crm-ticketing-tool.onrender.com/api'
const envBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()

const DEFAULT_API_BASE_URL = import.meta.env.PROD
  ? RENDER_API_BASE_URL
  : 'http://localhost:5000/api'

const resolvedBaseUrl =
  import.meta.env.PROD && (!envBaseUrl || /localhost|127\.0\.0\.1/.test(envBaseUrl))
    ? RENDER_API_BASE_URL
    : envBaseUrl || DEFAULT_API_BASE_URL

const api = axios.create({
  baseURL: resolvedBaseUrl,
  timeout: 15000,
})

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status
    const url = error?.config?.url || ''
    const isAuthCall = url.includes('/auth/login') || url.includes('/auth/register')

    if ((status === 401 || status === 403) && !isAuthCall) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  },
)

export default api

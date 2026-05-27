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

export default api

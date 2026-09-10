import axios from 'axios'

const DEFAULT_LOCAL_API_BASE = '/api'
const DEFAULT_PROD_API_BASE = 'https://api.laudojuros.com.br/api'

function normalizeApiBase(rawValue) {
  const raw = String(rawValue || '').trim()
  if (raw === '') {
    return import.meta.env.DEV ? DEFAULT_LOCAL_API_BASE : DEFAULT_PROD_API_BASE
  }
  if (raw.startsWith('/')) return raw
  let normalized = raw
  if (/^https?:\/\//i.test(normalized) === false) {
    normalized = `https://${normalized}`
  }
  if (/\/api\/?$/i.test(normalized) === false) {
    normalized = `${normalized.replace(/\/+$/, '')}/api`
  }
  return normalized.replace(/\/+$/, '')
}

const API_BASE = normalizeApiBase(import.meta.env.VITE_API_URL)
const api = axios.create({ baseURL: API_BASE, headers: { 'Content-Type': 'application/json' }, timeout: 120000 })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  const baseUrl = String(config.baseURL || '')
  const url = typeof config.url === 'string' ? config.url : ''
  if (baseUrl.replace(/\/+$/, '').endsWith('/api') && url.startsWith('/api/')) {
    config.url = url.replace(/^\/api/, '')
  }
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    }
    return Promise.reject(err)
  }
)

export const login = (email, password) => {
  const form = new FormData()
  form.append('username', email)
  form.append('password', password)
  return api.post('/auth/login', form, { headers: { 'Content-Type': 'multipart/form-data' } })
}
export const register = (name, email, password) => api.post('/auth/register', { name, email, password })
export const startGuestSession = () => api.post('/auth/guest')
export const ensureGuestSession = async () => {
  const token = localStorage.getItem('token')
  if (token) return true

  try {
    const res = await startGuestSession()
    localStorage.setItem('token', res.data.access_token)
    localStorage.setItem('user', JSON.stringify({
      name: res.data.user_name,
      email: res.data.user_email,
      is_guest: res.data.is_guest === true,
    }))
    return true
  } catch {
    return false
  }
}
export const getMe = () => api.get('/auth/me')

export const getLoanTypes = () => api.get('/public/loan-types')
export const getPricing = () => api.get('/public/pricing')
export const getRanking = () => api.get('/public/ranking')
export const getStats = () => api.get('/public/stats')

export const uploadContract = (file, loanType, phone) => {
  const form = new FormData()
  form.append('file', file)
  form.append('loan_type', loanType)
  if (phone) form.append('user_phone', phone)
  return api.post('/contracts/upload', form, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 300000 })
}
export const getContractStatus = (contractId) => api.get(`/contracts/${contractId}/status`)
export const getHistory = () => api.get('/contracts/history')

export const createPayment = (analysisId) => api.post(`/payments/create/${analysisId}`)
export const getPaymentStatus = (paymentId) => api.get(`/payments/${paymentId}/status`)
export const confirmMockPayment = (paymentId) => api.post(`/payments/confirm-mock/${paymentId}`)

export const getFullReport = (analysisId) => api.get(`/reports/${analysisId}/full`)
export const getReportDownloadUrl = (analysisId) => `${API_BASE}/reports/${analysisId}/download`
export const downloadReportPdf = (analysisId) =>
  api.get(`/reports/${analysisId}/download`, { responseType: 'blob' })

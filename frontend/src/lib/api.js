import axios from 'axios'

function normalizeApiBase(rawValue) {
  const raw = String(rawValue || '').trim()
  if (!raw) return '/api'
  if (raw.startsWith('/')) return raw

  let normalized = raw
  if (!/^https?:\/\//i.test(normalized)) {
    normalized = `https://${normalized}`
  }
  if (!/\/api\/?$/i.test(normalized)) {
    normalized = `${normalized.replace(/\/+$/, '')}/api`
  }
  return normalized.replace(/\/+$/, '')
}

const API_BASE = normalizeApiBase(import.meta.env.VITE_API_URL)

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 120000,
})

// Injeta token em todas as requisições
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

// Redireciona para login em caso de 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const userRaw = localStorage.getItem('user')
      const user = userRaw ? JSON.parse(userRaw) : null
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = user?.is_guest ? '/' : '/login'
    }
    return Promise.reject(err)
  }
)

// ── AUTH ──────────────────────────────────────────────────────────
export const login = (email, password) => {
  const form = new FormData()
  form.append('username', email)
  form.append('password', password)
  return api.post('/auth/login', form, { headers: { 'Content-Type': 'multipart/form-data' } })
}
export const register = (name, email, password) =>
  api.post('/auth/register', { name, email, password })
export const startGuestSession = () => api.post('/auth/guest')
export const upgradeGuestAccount = (name, email, password) =>
  api.post('/auth/upgrade-guest', { name, email, password })
export const getMe = () => api.get('/auth/me')

// ── PUBLIC ────────────────────────────────────────────────────────
export const getLoanTypes = () => api.get('/public/loan-types')
export const getPricing = () => api.get('/public/pricing')

// ── CONTRATOS ─────────────────────────────────────────────────────
export const uploadContract = (file, loanType) => {
  const form = new FormData()
  form.append('file', file)
  form.append('loan_type', loanType)
  return api.post('/contracts/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 300000,
  })
}
export const getContractStatus = (contractId) =>
  api.get(`/contracts/${contractId}/status`)
export const getHistory = () => api.get('/contracts/history')

// ── LAUDOS ────────────────────────────────────────────────────────
export const getReportPreview = (analysisId) =>
  api.get(`/reports/${analysisId}/preview`)
export const getFullReport = (analysisId) =>
  api.get(`/reports/${analysisId}/full`)
export const getReportDownloadUrl = (analysisId) =>
  `${API_BASE}/reports/${analysisId}/download?token=${localStorage.getItem('token')}`

// ── PAGAMENTOS ────────────────────────────────────────────────────
export const createPayment = (analysisId) =>
  api.post(`/payments/create/${analysisId}`)
export const getPaymentStatus = (paymentId) =>
  api.get(`/payments/${paymentId}/status`)
export const confirmMockPayment = (paymentId) =>
  api.post(`/payments/confirm-mock/${paymentId}`)

export default api

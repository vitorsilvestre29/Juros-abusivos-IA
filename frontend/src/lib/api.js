import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 90000 // 90s para cobrir cold start do Render (~50s)
})

// Interceptor: adiciona o token em todas as requisições
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  const baseUrl = String(config.baseURL || '')
  const url = typeof config.url === 'string' ? config.url : ''

  // Evita URL duplicada como /api/api/... quando baseURL já termina com /api.
  if (baseUrl.replace(/\/+$/, '').endsWith('/api') && url.startsWith('/api/')) {
    config.url = url.replace(/^\/api/, '')
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Interceptor: trata erros globalmente
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth
export const login = (email, password) => {
  const formData = new FormData()
  formData.append('username', email)
  formData.append('password', password)
  return api.post('/auth/login', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export const getMe = () => api.get('/auth/me')

// Cases
export const getCases = () => api.get('/cases/')
export const createCase = (data) => api.post('/cases/', data)
export const getCase = (id) => api.get(`/cases/${id}`)
export const updateCase = (id, data) => api.patch(`/cases/${id}`, data)
export const deleteCase = (id) => api.delete(`/cases/${id}`)
export const uploadContract = (caseId, file, bankName = '') => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('bank_name', bankName)
  return api.post(`/cases/${caseId}/upload-contract`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    // Upload + análise OCR/IA pode levar mais que o timeout padrão.
    timeout: 300000
  })
}

// Chat
export const startChat = () => api.post('/chat/start')
export const getMessages = (caseId) => api.get(`/chat/${caseId}/messages`)
export const sendMessage = (caseId, content) =>
  api.post(`/chat/${caseId}/message`, { content })

// Documents
export const generateDocument = (caseId, docType, additionalData = {}) =>
  api.post(`/documents/${caseId}/generate`, { doc_type: docType, additional_data: additionalData }, {
    timeout: 300000  // 5 min — geração de documentos pode levar 2-3 min (2 chamadas Sonnet)
  })
export const listDocuments = (caseId) => api.get(`/documents/${caseId}/list`)
export const getDownloadUrl = (caseId, docId) =>
  `${API_BASE}/documents/${caseId}/download/${docId}?token=${localStorage.getItem('token')}`

export default api

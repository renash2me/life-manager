const API_BASE = import.meta.env.VITE_API_URL || '/api'

async function apiRequest(path, options = {}) {
  const url = `${API_BASE}${path}`
  const headers = { 'Content-Type': 'application/json', ...options.headers }

  // Add auth token if available
  const token = localStorage.getItem('lm_token')
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(url, { headers, ...options })

  // Handle 401 - redirect to login
  if (response.status === 401) {
    localStorage.removeItem('lm_token')
    localStorage.removeItem('lm_user')
    window.location.href = '/login'
    throw new Error('Sessão expirada')
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || `HTTP ${response.status}`)
  }
  if (response.status === 204) return null
  return response.json()
}

export const api = {
  // Auth
  login: (data) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  register: (data) => apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => apiRequest('/auth/me'),

  // Health
  getHealthOverview: (days = 7) => apiRequest(`/dashboard/health?days=${days}`),
  getDailySummary: (date) => apiRequest(`/dashboard/summary${date ? `?date=${date}` : ''}`),
  getMetricNames: () => apiRequest('/health/metrics/names'),

  // Gamification
  getActions: () => apiRequest('/actions'),
  createAction: (data) => apiRequest('/actions', { method: 'POST', body: JSON.stringify(data) }),
  updateAction: (id, data) => apiRequest(`/actions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAction: (id) => apiRequest(`/actions/${id}`, { method: 'DELETE' }),

  getEvents: (days = 30) => apiRequest(`/events?days=${days}`),
  createEvent: (data) => apiRequest('/events', { method: 'POST', body: JSON.stringify(data) }),

  getScore: (date) => apiRequest(`/score?date=${date}`),
  getScoreHistory: (days = 30) => apiRequest(`/score/history?days=${days}`),

  // Trophies
  getTrophies: () => apiRequest('/trophies'),
  getUserTrophies: () => apiRequest('/trophies/earned'),
  createTrophy: (data) => apiRequest('/trophies', { method: 'POST', body: JSON.stringify(data) }),

  // User
  getUser: () => apiRequest('/user/me'),
  updateUser: (data) => apiRequest('/user/me', { method: 'PUT', body: JSON.stringify(data) }),
  getUserStats: () => apiRequest('/user/stats'),

  // Info
  getInfo: () => apiRequest('/info'),
}

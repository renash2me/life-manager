const API_BASE = import.meta.env.VITE_API_URL || '/api'

async function apiRequest(path, options = {}) {
  const url = `${API_BASE}${path}`
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || `HTTP ${response.status}`)
  }
  if (response.status === 204) return null
  return response.json()
}

export const api = {
  // Health
  getHealthOverview: (days = 7) => apiRequest(`/dashboard/health?days=${days}`),
  getDailySummary: () => apiRequest('/dashboard/summary'),
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
  getUser: () => apiRequest('/user/1'),
  updateUser: (data) => apiRequest('/user/1', { method: 'PUT', body: JSON.stringify(data) }),

  // Info
  getInfo: () => apiRequest('/info'),
}

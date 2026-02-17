const API_BASE = import.meta.env.VITE_API_URL || '/api'

async function apiRequest(path, options = {}) {
  const url = `${API_BASE}${path}`
  const { headers: extraHeaders, ...fetchOptions } = options
  const headers = { 'Content-Type': 'application/json', ...extraHeaders }

  // Add auth token if available
  const token = localStorage.getItem('lm_token')
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(url, { ...fetchOptions, headers })

  // Only redirect on 401 (expired/missing token)
  if (response.status === 401) {
    if (!path.startsWith('/auth/')) {
      localStorage.removeItem('lm_token')
      localStorage.removeItem('lm_user')
      window.location.href = '/login'
      throw new Error('Sessao expirada')
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || error.msg || `HTTP ${response.status}`)
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
  getMetricDetail: (key, days = 365) => apiRequest(`/dashboard/metric/${key}?days=${days}`),

  // Gamification
  getActions: () => apiRequest('/actions'),
  createAction: (data) => apiRequest('/actions', { method: 'POST', body: JSON.stringify(data) }),
  updateAction: (id, data) => apiRequest(`/actions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAction: (id) => apiRequest(`/actions/${id}`, { method: 'DELETE' }),

  getEvents: (days = 30) => apiRequest(`/events?days=${days}`),
  getXpHistory: (days = 30) => apiRequest(`/events/xp-history?days=${days}`),
  createEvent: (data) => apiRequest('/events', { method: 'POST', body: JSON.stringify(data) }),
  deleteEvent: (id) => apiRequest(`/events/${id}`, { method: 'DELETE' }),

  getScore: (date) => apiRequest(`/score?date=${date}`),
  getScoreHistory: (days = 30) => apiRequest(`/score/history?days=${days}`),

  // Trophies
  getTrophies: () => apiRequest('/trophies'),
  getUserTrophies: () => apiRequest('/trophies/earned'),
  createTrophy: (data) => apiRequest('/trophies', { method: 'POST', body: JSON.stringify(data) }),

  // User
  getUser: () => apiRequest('/user/me'),
  updateUser: (data) => apiRequest('/user/me', { method: 'PUT', body: JSON.stringify(data) }),
  updatePreferences: (data) => apiRequest('/user/preferences', { method: 'PATCH', body: JSON.stringify(data) }),
  getUserStats: () => apiRequest('/user/stats'),

  // Evolution
  getEvolution: (days = 365) => apiRequest(`/dashboard/evolution?days=${days}`),
  getMetricsConfig: () => apiRequest('/dashboard/metrics-config'),

  // Goals (v3 - tree hierarchy)
  getGoals: () => apiRequest('/goals'),
  getDailyGoals: () => apiRequest('/goals/daily'),
  getAvailableMetrics: () => apiRequest('/goals/metrics'),
  createGoal: (data) => apiRequest('/goals', { method: 'POST', body: JSON.stringify(data) }),
  updateGoal: (id, data) => apiRequest(`/goals/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteGoal: (id) => apiRequest(`/goals/${id}`, { method: 'DELETE' }),
  checkGoal: (id) => apiRequest(`/goals/${id}/check`, { method: 'POST' }),
  uncheckGoal: (id) => apiRequest(`/goals/${id}/check`, { method: 'DELETE' }),

  // Nutrition
  searchFoods: (q, category, page) => apiRequest(`/nutrition/foods?q=${encodeURIComponent(q || '')}&category=${encodeURIComponent(category || '')}&page=${page || 1}`),
  createFood: (data) => apiRequest('/nutrition/foods', { method: 'POST', body: JSON.stringify(data) }),
  getFoodCategories: () => apiRequest('/nutrition/foods/categories'),
  getNutritionProfile: () => apiRequest('/nutrition/profile'),
  updateNutritionProfile: (data) => apiRequest('/nutrition/profile', { method: 'PUT', body: JSON.stringify(data) }),
  getNutritionOptions: () => apiRequest('/nutrition/profile/options'),
  getMealPlans: () => apiRequest('/nutrition/meal-plans'),
  createMealPlan: (data) => apiRequest('/nutrition/meal-plans', { method: 'POST', body: JSON.stringify(data) }),
  getMealPlan: (id) => apiRequest(`/nutrition/meal-plans/${id}`),
  updateMealPlan: (id, data) => apiRequest(`/nutrition/meal-plans/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMealPlan: (id) => apiRequest(`/nutrition/meal-plans/${id}`, { method: 'DELETE' }),
  addPlanItem: (planId, data) => apiRequest(`/nutrition/meal-plans/${planId}/items`, { method: 'POST', body: JSON.stringify(data) }),
  updatePlanItem: (planId, itemId, data) => apiRequest(`/nutrition/meal-plans/${planId}/items/${itemId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePlanItem: (planId, itemId) => apiRequest(`/nutrition/meal-plans/${planId}/items/${itemId}`, { method: 'DELETE' }),
  suggestMealPlan: () => apiRequest('/nutrition/meal-plans/suggest', { method: 'POST', body: '{}' }),
  getFoodLog: (date) => apiRequest(`/nutrition/log?date=${date || ''}`),
  addFoodLog: (data) => apiRequest('/nutrition/log', { method: 'POST', body: JSON.stringify(data) }),
  deleteFoodLog: (id) => apiRequest(`/nutrition/log/${id}`, { method: 'DELETE' }),
  copyPlanToLog: (data) => apiRequest('/nutrition/log/from-plan', { method: 'POST', body: JSON.stringify(data) }),
  getNutritionSummary: (date) => apiRequest(`/nutrition/summary?date=${date || ''}`),
  getNutritionHistory: (days) => apiRequest(`/nutrition/history?days=${days || 30}`),

  // Workout Tracking
  getExercises: (q, muscleGroup) => apiRequest(`/workouts-tracking/exercises?q=${encodeURIComponent(q || '')}&muscle_group=${encodeURIComponent(muscleGroup || '')}`),
  createExercise: (data) => apiRequest('/workouts-tracking/exercises', { method: 'POST', body: JSON.stringify(data) }),
  getMuscleGroups: () => apiRequest('/workouts-tracking/exercises/muscle-groups'),
  getWorkoutPlans: () => apiRequest('/workouts-tracking/plans'),
  createWorkoutPlan: (data) => apiRequest('/workouts-tracking/plans', { method: 'POST', body: JSON.stringify(data) }),
  getWorkoutPlan: (id) => apiRequest(`/workouts-tracking/plans/${id}`),
  updateWorkoutPlan: (id, data) => apiRequest(`/workouts-tracking/plans/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteWorkoutPlan: (id) => apiRequest(`/workouts-tracking/plans/${id}`, { method: 'DELETE' }),
  addPlanExercise: (planId, data) => apiRequest(`/workouts-tracking/plans/${planId}/exercises`, { method: 'POST', body: JSON.stringify(data) }),
  updatePlanExercise: (planId, peId, data) => apiRequest(`/workouts-tracking/plans/${planId}/exercises/${peId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePlanExercise: (planId, peId) => apiRequest(`/workouts-tracking/plans/${planId}/exercises/${peId}`, { method: 'DELETE' }),
  getWorkoutSessions: (days) => apiRequest(`/workouts-tracking/sessions?days=${days || 30}`),
  createWorkoutSession: (data) => apiRequest('/workouts-tracking/sessions', { method: 'POST', body: JSON.stringify(data) }),
  getWorkoutSession: (id) => apiRequest(`/workouts-tracking/sessions/${id}`),
  updateWorkoutSession: (id, data) => apiRequest(`/workouts-tracking/sessions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteWorkoutSession: (id) => apiRequest(`/workouts-tracking/sessions/${id}`, { method: 'DELETE' }),
  addWorkoutSet: (sessionId, data) => apiRequest(`/workouts-tracking/sessions/${sessionId}/sets`, { method: 'POST', body: JSON.stringify(data) }),
  updateWorkoutSet: (sessionId, setId, data) => apiRequest(`/workouts-tracking/sessions/${sessionId}/sets/${setId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteWorkoutSet: (sessionId, setId) => apiRequest(`/workouts-tracking/sessions/${sessionId}/sets/${setId}`, { method: 'DELETE' }),
  getExerciseProgress: (exerciseId, days) => apiRequest(`/workouts-tracking/progress/${exerciseId}?days=${days || 90}`),

  // Info
  getInfo: () => apiRequest('/info'),
}

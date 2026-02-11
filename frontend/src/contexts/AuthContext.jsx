import { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('lm_token')
    if (token) {
      api.getMe()
        .then(setUser)
        .catch(() => {
          localStorage.removeItem('lm_token')
          localStorage.removeItem('lm_user')
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email, password) => {
    const result = await api.login({ email, password })
    localStorage.setItem('lm_token', result.token)
    localStorage.setItem('lm_user', JSON.stringify(result.user))
    setUser(result.user)
    return result
  }

  const register = async (nome, email, password) => {
    const result = await api.register({ nome, email, password })
    localStorage.setItem('lm_token', result.token)
    localStorage.setItem('lm_user', JSON.stringify(result.user))
    setUser(result.user)
    return result
  }

  const logout = () => {
    localStorage.removeItem('lm_token')
    localStorage.removeItem('lm_user')
    setUser(null)
  }

  const refreshUser = async () => {
    try {
      const userData = await api.getMe()
      setUser(userData)
    } catch {
      // ignore
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}

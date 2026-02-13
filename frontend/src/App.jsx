import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom'
import { Container, Navbar, Nav, Spinner, Button } from 'react-bootstrap'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import DashboardPage from './pages/DashboardPage'
import EventsPage from './pages/EventsPage'
import AdminPage from './pages/AdminPage'
import ProfilePage from './pages/ProfilePage'
import TrophiesPage from './pages/TrophiesPage'
import LoginPage from './pages/LoginPage'
import MetricDetailPage from './pages/MetricDetailPage'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="text-center mt-5"><Spinner animation="border" /></div>
  }
  if (!user) {
    return <Navigate to="/login" replace />
  }
  return children
}

function AppLayout() {
  const location = useLocation()
  const { user, logout } = useAuth()

  const navItems = [
    { path: '/', label: 'Dashboard' },
    { path: '/events', label: 'Eventos' },
    { path: '/trophies', label: 'Troféus' },
    { path: '/profile', label: 'Perfil' },
    { path: '/admin', label: 'Admin' },
  ]

  if (!user) return <Navigate to="/login" replace />

  return (
    <>
      <Navbar className="lm-navbar" expand="lg" sticky="top">
        <Container>
          <Navbar.Brand as={Link} to="/">
            <span className="lm-brand-icon">&#x2694;&#xFE0F;</span> Life Manager
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="main-nav" />
          <Navbar.Collapse id="main-nav">
            <Nav className="me-auto">
              {navItems.map((item) => (
                <Nav.Link
                  key={item.path}
                  as={Link}
                  to={item.path}
                  active={location.pathname === item.path}
                >
                  {item.label}
                </Nav.Link>
              ))}
            </Nav>
            <Nav>
              <Navbar.Text className="me-3 text-muted small">
                {user.nome}
              </Navbar.Text>
              <Button variant="outline-secondary" size="sm" onClick={logout}>
                Sair
              </Button>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
      <Container className="py-4">
        <Routes>
          <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/events" element={<ProtectedRoute><EventsPage /></ProtectedRoute>} />
          <Route path="/trophies" element={<ProtectedRoute><TrophiesPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
          <Route path="/metric/:metricKey" element={<ProtectedRoute><MetricDetailPage /></ProtectedRoute>} />
        </Routes>
      </Container>
    </>
  )
}

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="text-center mt-5"><Spinner animation="border" /></div>
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/*" element={<AppLayout />} />
    </Routes>
  )
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  )
}

export default App

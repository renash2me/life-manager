import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import { Container, Navbar, Nav } from 'react-bootstrap'
import DashboardPage from './pages/DashboardPage'
import EventsPage from './pages/EventsPage'
import AdminPage from './pages/AdminPage'
import ProfilePage from './pages/ProfilePage'
import TrophiesPage from './pages/TrophiesPage'

function AppLayout() {
  const location = useLocation()

  const navItems = [
    { path: '/', label: 'Dashboard' },
    { path: '/events', label: 'Eventos' },
    { path: '/trophies', label: 'Troféus' },
    { path: '/profile', label: 'Perfil' },
    { path: '/admin', label: 'Admin' },
  ]

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
          </Navbar.Collapse>
        </Container>
      </Navbar>
      <Container className="py-4">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/trophies" element={<TrophiesPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </Container>
    </>
  )
}

function App() {
  return (
    <Router>
      <AppLayout />
    </Router>
  )
}

export default App

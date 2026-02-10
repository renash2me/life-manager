import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import { Container, Navbar, Nav } from 'react-bootstrap'
import DashboardPage from './pages/DashboardPage'
import EventsPage from './pages/EventsPage'
import AdminPage from './pages/AdminPage'
import ProfilePage from './pages/ProfilePage'
import TrophiesPage from './pages/TrophiesPage'

function App() {
  return (
    <Router>
      <Navbar bg="dark" variant="dark" expand="lg" className="mb-4">
        <Container>
          <Navbar.Brand as={Link} to="/">Life Manager</Navbar.Brand>
          <Navbar.Toggle aria-controls="main-nav" />
          <Navbar.Collapse id="main-nav">
            <Nav className="me-auto">
              <Nav.Link as={Link} to="/">Dashboard</Nav.Link>
              <Nav.Link as={Link} to="/events">Eventos</Nav.Link>
              <Nav.Link as={Link} to="/trophies">Troféus</Nav.Link>
              <Nav.Link as={Link} to="/profile">Perfil</Nav.Link>
              <Nav.Link as={Link} to="/admin">Admin</Nav.Link>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
      <Container>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/trophies" element={<TrophiesPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </Container>
    </Router>
  )
}

export default App

import { useState } from 'react'
import { Container, Card, Form, Button, Alert, Tabs, Tab } from 'react-bootstrap'
import { useAuth } from '../contexts/AuthContext'

function LoginPage() {
  const { login, register } = useAuth()
  const [activeTab, setActiveTab] = useState('login')

  // Login form
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  // Register form
  const [regNome, setRegNome] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regError, setRegError] = useState('')
  const [regLoading, setRegLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoginError('')
    setLoginLoading(true)
    try {
      await login(loginEmail, loginPassword)
    } catch (err) {
      setLoginError(err.message)
    } finally {
      setLoginLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setRegError('')
    setRegLoading(true)
    try {
      await register(regNome, regEmail, regPassword)
    } catch (err) {
      setRegError(err.message)
    } finally {
      setRegLoading(false)
    }
  }

  return (
    <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
      <Card className="lm-form-card" style={{ width: '100%', maxWidth: 420 }}>
        <Card.Body>
          <div className="text-center mb-4">
            <span style={{ fontSize: 48 }}>&#x2694;&#xFE0F;</span>
            <h3 className="mt-2">Life Manager</h3>
          </div>

          <Tabs activeKey={activeTab} onSelect={setActiveTab} className="lm-admin-tabs mb-3">
            <Tab eventKey="login" title="Entrar">
              {loginError && <Alert variant="danger" dismissible onClose={() => setLoginError('')}>{loginError}</Alert>}
              <Form onSubmit={handleLogin}>
                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Senha</Form.Label>
                  <Form.Control
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                </Form.Group>
                <Button type="submit" variant="primary" className="w-100" disabled={loginLoading}>
                  {loginLoading ? 'Entrando...' : 'Entrar'}
                </Button>
              </Form>
            </Tab>

            <Tab eventKey="register" title="Registrar">
              {regError && <Alert variant="danger" dismissible onClose={() => setRegError('')}>{regError}</Alert>}
              <Form onSubmit={handleRegister}>
                <Form.Group className="mb-3">
                  <Form.Label>Nome</Form.Label>
                  <Form.Control
                    type="text"
                    value={regNome}
                    onChange={(e) => setRegNome(e.target.value)}
                    placeholder="Seu nome"
                    required
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Senha</Form.Label>
                  <Form.Control
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    required
                    minLength={4}
                  />
                </Form.Group>
                <Button type="submit" variant="primary" className="w-100" disabled={regLoading}>
                  {regLoading ? 'Registrando...' : 'Registrar'}
                </Button>
              </Form>
            </Tab>
          </Tabs>
        </Card.Body>
      </Card>
    </Container>
  )
}

export default LoginPage

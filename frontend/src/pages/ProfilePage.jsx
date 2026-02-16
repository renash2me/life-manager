import { useState, useEffect } from 'react'
import { Row, Col, Card, Spinner, Tabs, Tab, ProgressBar, Table, Form, Button } from 'react-bootstrap'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, ResponsiveContainer,
} from 'recharts'
import { api } from '../api/client'
import LevelBadge from '../components/LevelBadge'
import { fmtDate } from '../utils/date'

const AREA_DISPLAY = {
  Saude: 'Saúde',
  Relacionamentos: 'Relac.',
  'Vida Profissional': 'Profissional',
  'Hobbies e Lazer': 'Lazer',
  Espirito: 'Espírito',
  Mente: 'Mente',
  Financas: 'Finanças',
}

const HEALTH_STAT_CONFIG = {
  Vitalidade: { color: '#16a34a', icon: '💚', desc: 'Passos diários' },
  'Resistência': { color: '#0ea5e9', icon: '🛡️', desc: 'Horas de sono' },
  'Força': { color: '#ef4444', icon: '⚔️', desc: 'Treinos no mês' },
  Foco: { color: '#a855f7', icon: '🧘', desc: 'Dias de meditação' },
}

const AREA_COLORS = {
  Saude: '#16a34a',
  Relacionamentos: '#f59e42',
  'Vida Profissional': '#a21caf',
  'Hobbies e Lazer': '#0ea5e9',
  Espirito: '#f43f5e',
  Mente: '#facc15',
  Financas: '#7c3aed',
}

function StatBar({ label, value, color, icon, desc }) {
  return (
    <div className="mb-3">
      <div className="d-flex justify-content-between align-items-center mb-1">
        <span>
          {icon && <span className="me-2">{icon}</span>}
          <strong>{label}</strong>
          {desc && <small className="text-muted ms-2">({desc})</small>}
        </span>
        <span className="fw-bold">{value}/100</span>
      </div>
      <ProgressBar
        now={value}
        variant="info"
        style={{
          height: 10,
          backgroundColor: 'rgba(255,255,255,0.08)',
          '--bs-progress-bar-bg': color,
        }}
      />
    </div>
  )
}

function ProfilePage() {
  const [user, setUser] = useState(null)
  const [scoreHistory, setScoreHistory] = useState([])
  const [stats, setStats] = useState(null)
  const [xpHistory, setXpHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.getUser(),
      api.getScoreHistory(30),
      api.getUserStats(),
      api.getXpHistory(30),
    ])
      .then(([userData, history, statsData, xpData]) => {
        setUser(userData)
        setScoreHistory(history)
        setStats(statsData)
        setXpHistory(xpData)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="text-center mt-5"><Spinner animation="border" /></div>
  }

  const areaTotals = {}
  scoreHistory.forEach((day) => {
    Object.entries(day.porArea || {}).forEach(([area, val]) => {
      areaTotals[area] = (areaTotals[area] || 0) + val
    })
  })

  const radarData = Object.entries(areaTotals).map(([area, total]) => ({
    area: AREA_DISPLAY[area] || area,
    score: Math.round(total * 10) / 10,
  }))

  const totalScore = Object.values(areaTotals).reduce((a, b) => a + b, 0)

  return (
    <>
      <h4 className="lm-section-header mb-4">Perfil</h4>
      <Tabs defaultActiveKey="overview" className="lm-admin-tabs mb-4">
        <Tab eventKey="overview" title="Visão Geral">
          <Row>
            <Col md={4} className="mb-4">
              <LevelBadge user={user} />
              <Card className="mt-3">
                <Card.Body>
                  <Card.Title>Estatísticas (30 dias)</Card.Title>
                  <p>Score total: <strong>{Math.round(totalScore)}</strong></p>
                  <p>Dias ativos: <strong>{scoreHistory.filter((d) => d.total > 0).length}</strong></p>
                </Card.Body>
              </Card>
              <Card className="mt-3">
                <Card.Body>
                  <Card.Title>Dados Pessoais</Card.Title>
                  <Form onSubmit={(e) => {
                    e.preventDefault()
                    const altura = e.target.altura.value
                    api.updateUser({ altura: altura ? parseFloat(altura) : null })
                      .then(setUser)
                      .catch(console.error)
                  }}>
                    <Form.Group className="mb-2">
                      <Form.Label className="text-muted small">Altura (m)</Form.Label>
                      <div className="d-flex gap-2">
                        <Form.Control
                          type="number"
                          name="altura"
                          step="0.01"
                          min="1.00"
                          max="2.50"
                          placeholder="1.71"
                          defaultValue={user?.altura || ''}
                          size="sm"
                        />
                        <Button variant="outline-primary" size="sm" type="submit">Salvar</Button>
                      </div>
                    </Form.Group>
                  </Form>
                </Card.Body>
              </Card>
            </Col>
            <Col md={8}>
              <Card>
                <Card.Body>
                  <Card.Title>Equilíbrio das Áreas (30 dias)</Card.Title>
                  {radarData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={400}>
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="rgba(255,255,255,0.1)" />
                        <PolarAngleAxis dataKey="area" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                        <PolarRadiusAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                        <Radar name="Score" dataKey="score" stroke="#a855f7" fill="#7c3aed" fillOpacity={0.35} />
                      </RadarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-muted text-center mt-4">Registre eventos para ver seu equilíbrio</p>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>

        <Tab eventKey="character" title="Ficha do Personagem">
          <Row>
            <Col md={6} className="mb-4">
              <Card>
                <Card.Body>
                  <Card.Title className="mb-4">Stats de Saúde</Card.Title>
                  {stats?.health ? (
                    Object.entries(stats.health).map(([stat, value]) => {
                      const cfg = HEALTH_STAT_CONFIG[stat] || { color: '#888', icon: '', desc: '' }
                      return (
                        <StatBar
                          key={stat}
                          label={stat}
                          value={value}
                          color={cfg.color}
                          icon={cfg.icon}
                          desc={cfg.desc}
                        />
                      )
                    })
                  ) : (
                    <p className="text-muted">Sem dados suficientes ainda.</p>
                  )}
                </Card.Body>
              </Card>
            </Col>
            <Col md={6} className="mb-4">
              <Card>
                <Card.Body>
                  <Card.Title className="mb-4">Áreas de Vida</Card.Title>
                  {stats?.areas && Object.keys(stats.areas).length > 0 ? (
                    Object.entries(stats.areas).map(([area, value]) => (
                      <StatBar
                        key={area}
                        label={AREA_DISPLAY[area] || area}
                        value={value}
                        color={AREA_COLORS[area] || '#888'}
                      />
                    ))
                  ) : (
                    <p className="text-muted">Registre eventos para ver seus stats.</p>
                  )}
                </Card.Body>
              </Card>
            </Col>
            <Col md={12}>
              <Card>
                <Card.Body>
                  <Card.Title className="mb-3">Historico de XP (30 dias)</Card.Title>
                  {xpHistory.length > 0 ? (
                    <Table hover responsive size="sm" className="lm-table">
                      <thead>
                        <tr>
                          <th>Data</th>
                          <th>Acao</th>
                          <th>Descricao</th>
                          <th className="text-end">XP</th>
                        </tr>
                      </thead>
                      <tbody>
                        {xpHistory.map((entry, i) => (
                          <tr key={i}>
                            <td>{fmtDate(entry.date)}</td>
                            <td>{entry.actionNome}</td>
                            <td>{entry.descricao || '-'}</td>
                            <td className="text-end fw-bold" style={{ color: 'var(--lm-accent-green)' }}>+{entry.xpGained}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  ) : (
                    <p className="text-muted">Nenhum XP ganho nos ultimos 30 dias.</p>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>
      </Tabs>
    </>
  )
}

export default ProfilePage

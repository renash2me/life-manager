import { useState, useEffect } from 'react'
import { Row, Col, Card, Spinner, ProgressBar } from 'react-bootstrap'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, ResponsiveContainer,
} from 'recharts'
import { api } from '../api/client'
import LevelBadge from '../components/LevelBadge'

const AREA_DISPLAY = {
  Saude: 'Saúde',
  Relacionamentos: 'Relac.',
  'Vida Profissional': 'Profissional',
  'Hobbies e Lazer': 'Lazer',
  Espirito: 'Espírito',
  Mente: 'Mente',
  Financas: 'Finanças',
}

function ProfilePage() {
  const [user, setUser] = useState(null)
  const [scoreHistory, setScoreHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.getUser(),
      api.getScoreHistory(30),
    ])
      .then(([userData, history]) => {
        setUser(userData)
        setScoreHistory(history)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="text-center mt-5"><Spinner animation="border" /></div>
  }

  // Aggregate area totals from score history
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
      </Col>
      <Col md={8}>
        <Card>
          <Card.Body>
            <Card.Title>Equilíbrio das Áreas (30 dias)</Card.Title>
            {radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="area" fontSize={12} />
                  <PolarRadiusAxis />
                  <Radar name="Score" dataKey="score" stroke="#16a34a" fill="#16a34a" fillOpacity={0.3} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted text-center mt-4">Registre eventos para ver seu equilíbrio</p>
            )}
          </Card.Body>
        </Card>
      </Col>
    </Row>
  )
}

export default ProfilePage

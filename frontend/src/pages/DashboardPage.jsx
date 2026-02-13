import { useState, useEffect, useRef } from 'react'
import { Row, Col, Card, Spinner, ButtonGroup, ToggleButton, Button, Form } from 'react-bootstrap'
import { api } from '../api/client'
import ScoreCard from '../components/ScoreCard'
import HealthCharts from '../components/HealthCharts'
import LevelBadge from '../components/LevelBadge'

const periodOptions = [
  { label: 'Diario', value: 'daily' },
  { label: 'Semanal', value: 'weekly' },
  { label: 'Mensal', value: 'monthly' },
  { label: 'Anual', value: 'yearly' },
]

const periodDays = { daily: 1, weekly: 7, monthly: 30, yearly: 365 }

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
}

function MetricCard({ icon, label, children }) {
  return (
    <Card className="lm-metric-card text-center">
      <Card.Body>
        <Card.Subtitle className="text-muted mb-1">
          <span className="lm-metric-icon">{icon}</span> {label}
        </Card.Subtitle>
        <h3>{children}</h3>
      </Card.Body>
    </Card>
  )
}

function DashboardPage() {
  const [summary, setSummary] = useState(null)
  const [healthData, setHealthData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('daily')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10))
  const [chartsLoading, setChartsLoading] = useState(false)
  const [favorites, setFavorites] = useState([])
  const initialLoad = useRef(true)

  const loadData = (p, d) => {
    const days = periodDays[p]
    const summaryDate = p === 'daily' ? d : undefined

    return Promise.all([
      api.getDailySummary(summaryDate),
      days > 1 ? api.getHealthOverview(days) : Promise.resolve(null),
    ]).then(([summaryData, health]) => {
      setSummary(summaryData)
      setHealthData(health)
    })
  }

  useEffect(() => {
    // Load user preferences for favorites
    api.getUser().then((user) => {
      setFavorites(user.preferences?.favoriteCharts || [])
    }).catch(() => {})

    loadData(period, selectedDate)
      .catch(console.error)
      .finally(() => {
        setLoading(false)
        initialLoad.current = false
      })
  }, [])

  useEffect(() => {
    if (initialLoad.current) return
    setChartsLoading(true)
    loadData(period, selectedDate)
      .catch(console.error)
      .finally(() => setChartsLoading(false))
  }, [period, selectedDate])

  const handleToggleFavorite = (chartKey) => {
    setFavorites((prev) => {
      const next = prev.includes(chartKey)
        ? prev.filter((k) => k !== chartKey)
        : [...prev, chartKey]
      // Persist to backend (fire-and-forget)
      api.updatePreferences({ favoriteCharts: next }).catch(console.error)
      return next
    })
  }

  const navigateDate = (offset) => {
    const d = new Date(selectedDate + 'T12:00:00')
    d.setDate(d.getDate() + offset)
    setSelectedDate(d.toISOString().slice(0, 10))
  }

  if (loading) {
    return <div className="text-center mt-5"><Spinner animation="border" /></div>
  }

  const hasHealthData = healthData && (
    healthData.steps?.length > 0 ||
    healthData.sleep?.length > 0 ||
    healthData.heartRate?.length > 0 ||
    healthData.weight?.length > 0
  )

  const isToday = selectedDate === new Date().toISOString().slice(0, 10)

  return (
    <>
      <Row className="mb-4 g-3">
        <Col md={3}>
          <LevelBadge user={summary?.user} />
        </Col>
        <Col md={3}>
          <ScoreCard score={summary?.score} />
        </Col>
        <Col md={6}>
          <Row className="g-2">
            <Col xs={4}>
              <MetricCard icon="&#x1F6B6;" label="Passos">
                {summary?.steps?.qty?.toLocaleString() || '--'}
              </MetricCard>
            </Col>
            <Col xs={4}>
              <MetricCard icon="&#x1F525;" label="Calorias">
                {summary?.activeEnergy?.kcal?.toLocaleString() || '--'}
              </MetricCard>
            </Col>
            <Col xs={4}>
              <MetricCard icon="&#x2696;&#xFE0F;" label="Peso">
                {summary?.weight?.qty ? `${Number(summary.weight.qty).toFixed(1)}` : '--'}
              </MetricCard>
            </Col>
          </Row>
          <Row className="g-2 mt-1">
            <Col xs={4}>
              <MetricCard icon="&#x1F31C;" label="Sono">
                {summary?.sleep?.asleep ? (() => { const v = Number(summary.sleep.asleep); const hrs = v > 24 ? v / 3600 : v; const h = Math.floor(hrs); const m = Math.round((hrs - h) * 60); return `${String(h).padStart(2,'0')}h${String(m).padStart(2,'0')}`; })() : '--'}
              </MetricCard>
            </Col>
            <Col xs={4}>
              <MetricCard icon="&#x2764;&#xFE0F;" label="FC Repouso">
                {summary?.restingHeartRate?.avg ? `${summary.restingHeartRate.avg}` : '--'}
              </MetricCard>
            </Col>
            <Col xs={4}>
              <MetricCard icon="&#x1F9D8;" label="Meditacao">
                {summary?.mindfulness?.minutes ? `${summary.mindfulness.minutes}m` : '--'}
              </MetricCard>
            </Col>
          </Row>
        </Col>
      </Row>

      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <h5 className="lm-section-header mb-0">Dados de Saude</h5>
        <div className="d-flex align-items-center gap-3 flex-wrap">
          {period === 'daily' && (
            <div className="d-flex align-items-center gap-2">
              <Button variant="outline-secondary" size="sm" onClick={() => navigateDate(-1)}>
                &#x25C0;
              </Button>
              <Form.Control
                type="date"
                size="sm"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{ width: 160 }}
              />
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => navigateDate(1)}
                disabled={isToday}
              >
                &#x25B6;
              </Button>
              {!isToday && (
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={() => setSelectedDate(new Date().toISOString().slice(0, 10))}
                >
                  Hoje
                </Button>
              )}
            </div>
          )}
          <ButtonGroup className="lm-period-selector">
            {periodOptions.map((opt) => (
              <ToggleButton
                key={opt.value}
                id={`period-${opt.value}`}
                type="radio"
                variant="outline-secondary"
                name="period"
                value={opt.value}
                checked={period === opt.value}
                onChange={(e) => setPeriod(e.currentTarget.value)}
              >
                {opt.label}
              </ToggleButton>
            ))}
          </ButtonGroup>
        </div>
      </div>

      {period === 'daily' && (
        <div className="text-center mb-3">
          <span className="text-muted">{formatDate(selectedDate)}</span>
        </div>
      )}

      {chartsLoading && (
        <div className="text-center mb-3"><Spinner animation="border" size="sm" /></div>
      )}

      {period === 'daily' ? (
        <Card className="text-center p-4 mb-4">
          <Card.Body>
            <p className="text-muted mb-0">
              No modo diario, os dados resumidos aparecem nos cards acima.
              Selecione Semanal, Mensal ou Anual para ver graficos de tendencia.
            </p>
          </Card.Body>
        </Card>
      ) : hasHealthData ? (
        <HealthCharts
          data={healthData}
          favorites={favorites}
          onToggleFavorite={handleToggleFavorite}
        />
      ) : (
        <Card className="text-center p-5">
          <Card.Body>
            <h5 className="text-muted">Nenhum dado de saude ainda</h5>
            <p className="text-muted">
              Configure o Health Auto Export no seu iPhone para enviar dados automaticamente.
            </p>
          </Card.Body>
        </Card>
      )}
    </>
  )
}

export default DashboardPage

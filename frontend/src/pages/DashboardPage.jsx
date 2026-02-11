import { useState, useEffect, useRef } from 'react'
import { Row, Col, Card, Spinner, ButtonGroup, ToggleButton } from 'react-bootstrap'
import { api } from '../api/client'
import ScoreCard from '../components/ScoreCard'
import HealthCharts from '../components/HealthCharts'
import LevelBadge from '../components/LevelBadge'

const periodOptions = [
  { label: '7 dias', value: 7 },
  { label: '30 dias', value: 30 },
  { label: '90 dias', value: 90 },
]

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
  const [period, setPeriod] = useState(7)
  const [chartsLoading, setChartsLoading] = useState(false)
  const initialLoad = useRef(true)

  useEffect(() => {
    Promise.all([
      api.getDailySummary(),
      api.getHealthOverview(period),
    ])
      .then(([summaryData, health]) => {
        setSummary(summaryData)
        setHealthData(health)
      })
      .catch(console.error)
      .finally(() => {
        setLoading(false)
        initialLoad.current = false
      })
  }, [])

  useEffect(() => {
    if (initialLoad.current) return
    setChartsLoading(true)
    api.getHealthOverview(period)
      .then(setHealthData)
      .catch(console.error)
      .finally(() => setChartsLoading(false))
  }, [period])

  if (loading) {
    return <div className="text-center mt-5"><Spinner animation="border" /></div>
  }

  const hasHealthData = healthData && (
    healthData.steps?.length > 0 ||
    healthData.sleep?.length > 0 ||
    healthData.heartRate?.length > 0 ||
    healthData.weight?.length > 0
  )

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
                {summary?.sleep?.asleep ? `${(summary.sleep.asleep / 3600).toFixed(1)}h` : '--'}
              </MetricCard>
            </Col>
            <Col xs={4}>
              <MetricCard icon="&#x2764;&#xFE0F;" label="FC Repouso">
                {summary?.restingHeartRate?.avg ? `${summary.restingHeartRate.avg}` : '--'}
              </MetricCard>
            </Col>
            <Col xs={4}>
              <MetricCard icon="&#x2B50;" label="Score">
                {summary?.score?.total?.toFixed(1) || '--'}
              </MetricCard>
            </Col>
          </Row>
        </Col>
      </Row>

      <div className="d-flex justify-content-between align-items-center mb-4">
        <h5 className="lm-section-header mb-0">Dados de Saúde</h5>
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
              onChange={(e) => setPeriod(Number(e.currentTarget.value))}
            >
              {opt.label}
            </ToggleButton>
          ))}
        </ButtonGroup>
      </div>

      {chartsLoading && (
        <div className="text-center mb-3"><Spinner animation="border" size="sm" /></div>
      )}

      {hasHealthData ? (
        <HealthCharts data={healthData} />
      ) : (
        <Card className="text-center p-5">
          <Card.Body>
            <h5 className="text-muted">Nenhum dado de saúde ainda</h5>
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

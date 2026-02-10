import { useState, useEffect } from 'react'
import { Row, Col, Card, Spinner } from 'react-bootstrap'
import { api } from '../api/client'
import ScoreCard from '../components/ScoreCard'
import HealthCharts from '../components/HealthCharts'
import LevelBadge from '../components/LevelBadge'

function DashboardPage() {
  const [summary, setSummary] = useState(null)
  const [healthData, setHealthData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.getDailySummary(),
      api.getHealthOverview(7),
    ])
      .then(([summaryData, health]) => {
        setSummary(summaryData)
        setHealthData(health)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

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
      <Row className="mb-4">
        <Col md={3}>
          <LevelBadge user={summary?.user} />
        </Col>
        <Col md={3}>
          <ScoreCard score={summary?.score} />
        </Col>
        <Col md={6}>
          <Row>
            <Col xs={4}>
              <Card className="text-center">
                <Card.Body>
                  <Card.Subtitle className="text-muted mb-1">Passos Hoje</Card.Subtitle>
                  <h3>{summary?.steps?.qty?.toLocaleString() || '--'}</h3>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={4}>
              <Card className="text-center">
                <Card.Body>
                  <Card.Subtitle className="text-muted mb-1">Sono</Card.Subtitle>
                  <h3>{summary?.sleep?.asleep ? `${(summary.sleep.asleep / 3600).toFixed(1)}h` : '--'}</h3>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={4}>
              <Card className="text-center">
                <Card.Body>
                  <Card.Subtitle className="text-muted mb-1">Peso</Card.Subtitle>
                  <h3>{summary?.weight?.qty ? `${summary.weight.qty.toFixed(1)} kg` : '--'}</h3>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Col>
      </Row>

      {hasHealthData ? (
        <HealthCharts data={healthData} />
      ) : (
        <Card className="text-center p-5">
          <Card.Body>
            <h5 className="text-muted">Nenhum dado de saúde ainda</h5>
            <p className="text-muted">
              Configure o Health Auto Export no seu iPhone para enviar dados automaticamente
              para <code>http://seu-servidor:5000/api/health/ingest</code>
            </p>
          </Card.Body>
        </Card>
      )}
    </>
  )
}

export default DashboardPage

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Spinner, ButtonGroup, ToggleButton, Button, Table, Row, Col } from 'react-bootstrap'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { api } from '../api/client'
import { fmtDate, fmtDateShort } from '../utils/date'

const GRID_STROKE = 'rgba(255,255,255,0.06)'
const TICK_STYLE = { fill: '#94a3b8', fontSize: 11 }
const TOOLTIP_STYLE = {
  backgroundColor: '#1a1d28',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  color: '#e2e8f0',
}

const PERIOD_OPTIONS = [
  { label: '7d', value: 7 },
  { label: '30d', value: 30 },
  { label: '90d', value: 90 },
  { label: '1a', value: 365 },
  { label: 'Tudo', value: 9999 },
]

function MetricDetailPage() {
  const { metricKey } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)

  useEffect(() => {
    setLoading(true)
    api.getMetricDetail(metricKey, days)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [metricKey, days])

  if (loading) {
    return <div className="text-center mt-5"><Spinner animation="border" /></div>
  }

  if (!data) {
    return (
      <Card className="text-center p-5">
        <Card.Body>
          <h5 className="text-muted">Metrica nao encontrada</h5>
          <Button variant="outline-primary" className="mt-3" onClick={() => navigate('/')}>Voltar</Button>
        </Card.Body>
      </Card>
    )
  }

  // Use color and unit from the API response (dynamic)
  const color = data.color || '#7c3aed'
  const unit = data.unit || ''
  const chartData = (data.data || []).map((d) => ({ date: fmtDateShort(d.date), value: d.value }))

  const fmtValue = (v) => {
    if (v == null) return '--'
    // Special sleep formatting
    if (metricKey === 'sleep') {
      const h = Math.floor(v)
      const m = Math.round((v - h) * 60)
      return `${h}h${String(m).padStart(2, '0')}`
    }
    // Use unit from API for all other metrics
    if (unit) return `${v.toLocaleString()} ${unit}`
    return v.toLocaleString()
  }

  return (
    <>
      <div className="d-flex align-items-center gap-3 mb-4">
        <Button variant="outline-secondary" size="sm" onClick={() => navigate('/')}>
          &#x25C0; Voltar
        </Button>
        <h4 className="lm-section-header mb-0">{data.label}</h4>
      </div>

      {data.stats && Object.keys(data.stats).length > 0 && (
        <Row className="g-3 mb-4">
          <Col xs={6} md={3}>
            <Card className="lm-metric-card text-center">
              <Card.Body>
                <Card.Subtitle className="text-muted mb-1">Media</Card.Subtitle>
                <h4 className="mb-0">{fmtValue(data.stats.avg)}</h4>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={6} md={3}>
            <Card className="lm-metric-card text-center">
              <Card.Body>
                <Card.Subtitle className="text-muted mb-1">Minimo</Card.Subtitle>
                <h4 className="mb-0">{fmtValue(data.stats.min)}</h4>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={6} md={3}>
            <Card className="lm-metric-card text-center">
              <Card.Body>
                <Card.Subtitle className="text-muted mb-1">Maximo</Card.Subtitle>
                <h4 className="mb-0">{fmtValue(data.stats.max)}</h4>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={6} md={3}>
            <Card className="lm-metric-card text-center">
              <Card.Body>
                <Card.Subtitle className="text-muted mb-1">Registros</Card.Subtitle>
                <h4 className="mb-0">{data.stats.count}</h4>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      <div className="d-flex justify-content-end mb-3">
        <ButtonGroup className="lm-period-selector">
          {PERIOD_OPTIONS.map((opt) => (
            <ToggleButton
              key={opt.value}
              id={`metric-period-${opt.value}`}
              type="radio"
              variant="outline-secondary"
              name="metric-period"
              value={opt.value}
              checked={days === opt.value}
              onChange={() => setDays(opt.value)}
            >
              {opt.label}
            </ToggleButton>
          ))}
        </ButtonGroup>
      </div>

      {chartData.length > 0 ? (
        <Card className="lm-chart-card mb-4">
          <Card.Body>
            <ResponsiveContainer width="100%" height={350}>
              {data.chartType === 'line' ? (
                <LineChart data={chartData}>
                  <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={TICK_STYLE} />
                  <YAxis domain={['auto', 'auto']} tick={TICK_STYLE} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Line type="monotone" dataKey="value" stroke={color} name={data.label} dot={false} strokeWidth={2} />
                </LineChart>
              ) : (
                <BarChart data={chartData}>
                  <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={TICK_STYLE} />
                  <YAxis tick={TICK_STYLE} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="value" fill={color} name={data.label} radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </Card.Body>
        </Card>
      ) : (
        <Card className="text-center p-4 mb-4">
          <Card.Body>
            <p className="text-muted mb-0">Sem dados para o periodo selecionado.</p>
          </Card.Body>
        </Card>
      )}

      {data.data && data.data.length > 0 && (
        <Card>
          <Card.Body>
            <Card.Title>Registros</Card.Title>
            <Table hover responsive size="sm" className="lm-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th className="text-end">Valor</th>
                </tr>
              </thead>
              <tbody>
                {[...data.data].reverse().map((d, i) => (
                  <tr key={i}>
                    <td>{fmtDate(d.date)}</td>
                    <td className="text-end">{fmtValue(d.value)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}
    </>
  )
}

export default MetricDetailPage

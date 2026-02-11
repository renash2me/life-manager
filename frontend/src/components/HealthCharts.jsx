import { Row, Col, Card } from 'react-bootstrap'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'

const GRID_STROKE = 'rgba(255,255,255,0.06)'
const TICK_STYLE = { fill: '#94a3b8', fontSize: 11 }
const TOOLTIP_STYLE = {
  backgroundColor: '#1a1d28',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  color: '#e2e8f0',
}
const CHART_HEIGHT = 280

function HealthCharts({ data }) {
  if (!data) return null

  const stepsChart = (data.steps || []).map((d) => ({ date: d.date, steps: d.qty }))
  const sleepChart = (data.sleep || []).map((d) => ({
    date: d.date.slice(0, 10),
    total: d.asleep ? +(d.asleep / 3600).toFixed(1) : 0,
    deep: d.deep ? +(d.deep / 3600).toFixed(1) : 0,
    rem: d.rem ? +(d.rem / 3600).toFixed(1) : 0,
  }))
  const hrChart = (data.heartRate || []).map((d) => ({ date: d.date, avg: d.Avg, min: d.Min, max: d.Max }))
  const weightChart = (data.weight || []).map((d) => ({ date: d.date.slice(0, 10), kg: d.qty ? +Number(d.qty).toFixed(1) : 0 }))
  const energyChart = (data.activeEnergy || []).map((d) => ({ date: d.date, kcal: d.kcal }))
  const distanceChart = (data.distance || []).map((d) => ({ date: d.date, km: d.km }))

  return (
    <Row>
      {stepsChart.length > 0 && (
        <Col md={6} className="mb-4">
          <Card className="lm-chart-card">
            <Card.Body>
              <Card.Title>Passos</Card.Title>
              <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                <BarChart data={stepsChart}>
                  <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={TICK_STYLE} />
                  <YAxis tick={TICK_STYLE} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="steps" fill="#16a34a" name="Passos" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
      )}

      {energyChart.length > 0 && (
        <Col md={6} className="mb-4">
          <Card className="lm-chart-card">
            <Card.Body>
              <Card.Title>Calorias Ativas (kcal)</Card.Title>
              <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                <BarChart data={energyChart}>
                  <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={TICK_STYLE} />
                  <YAxis tick={TICK_STYLE} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="kcal" fill="#f59e42" name="kcal" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
      )}

      {sleepChart.length > 0 && (
        <Col md={6} className="mb-4">
          <Card className="lm-chart-card">
            <Card.Body>
              <Card.Title>Sono (horas)</Card.Title>
              <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                <BarChart data={sleepChart}>
                  <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={TICK_STYLE} />
                  <YAxis tick={TICK_STYLE} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
                  <Bar dataKey="total" fill="#7c3aed" name="Total" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="deep" fill="#3b82f6" name="Profundo" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="rem" fill="#f59e42" name="REM" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
      )}

      {hrChart.length > 0 && (
        <Col md={6} className="mb-4">
          <Card className="lm-chart-card">
            <Card.Body>
              <Card.Title>Frequência Cardíaca (bpm)</Card.Title>
              <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                <LineChart data={hrChart}>
                  <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={TICK_STYLE} />
                  <YAxis tick={TICK_STYLE} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
                  <Line type="monotone" dataKey="avg" stroke="#f43f5e" name="Média" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="min" stroke="#0ea5e9" name="Mín" dot={false} strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="max" stroke="#ef4444" name="Máx" dot={false} strokeDasharray="4 4" />
                </LineChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
      )}

      {distanceChart.length > 0 && (
        <Col md={6} className="mb-4">
          <Card className="lm-chart-card">
            <Card.Body>
              <Card.Title>Distância (km)</Card.Title>
              <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                <BarChart data={distanceChart}>
                  <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={TICK_STYLE} />
                  <YAxis tick={TICK_STYLE} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="km" fill="#0ea5e9" name="km" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
      )}

      {weightChart.length > 0 && (
        <Col md={6} className="mb-4">
          <Card className="lm-chart-card">
            <Card.Body>
              <Card.Title>Peso (kg)</Card.Title>
              <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                <LineChart data={weightChart}>
                  <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={TICK_STYLE} />
                  <YAxis domain={['auto', 'auto']} tick={TICK_STYLE} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Line type="monotone" dataKey="kg" stroke="#a21caf" name="Peso" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
      )}

      {(data.workouts || []).length > 0 && (
        <Col md={12} className="mb-4">
          <Card className="lm-chart-card">
            <Card.Body>
              <Card.Title>Treinos Recentes</Card.Title>
              <div className="table-responsive">
                <table className="table table-sm lm-table">
                  <thead>
                    <tr><th>Data</th><th>Treino</th><th>Duração</th></tr>
                  </thead>
                  <tbody>
                    {data.workouts.map((w, i) => (
                      <tr key={i}>
                        <td>{w.startTime ? w.startTime.slice(0, 10) : '--'}</td>
                        <td>{w.name}</td>
                        <td>{w.duration ? `${Math.round(w.duration / 60)} min` : '--'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card.Body>
          </Card>
        </Col>
      )}
    </Row>
  )
}

export default HealthCharts

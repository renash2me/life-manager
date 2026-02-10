import { Row, Col, Card } from 'react-bootstrap'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'

function HealthCharts({ data }) {
  if (!data) return null

  // Data already comes aggregated by day from the backend
  const stepsChart = (data.steps || []).map((d) => ({
    date: d.date,
    steps: d.qty,
  }))

  const sleepChart = (data.sleep || []).map((d) => ({
    date: d.date.slice(0, 10),
    total: d.asleep ? +(d.asleep / 3600).toFixed(1) : 0,
    deep: d.deep ? +(d.deep / 3600).toFixed(1) : 0,
    rem: d.rem ? +(d.rem / 3600).toFixed(1) : 0,
  }))

  const hrChart = (data.heartRate || []).map((d) => ({
    date: d.date,
    avg: d.Avg,
    min: d.Min,
    max: d.Max,
  }))

  const weightChart = (data.weight || []).map((d) => ({
    date: d.date.slice(0, 10),
    kg: d.qty ? +Number(d.qty).toFixed(1) : 0,
  }))

  const energyChart = (data.activeEnergy || []).map((d) => ({
    date: d.date,
    kcal: d.kcal,
  }))

  const distanceChart = (data.distance || []).map((d) => ({
    date: d.date,
    km: d.km,
  }))

  return (
    <Row>
      {stepsChart.length > 0 && (
        <Col md={6} className="mb-4">
          <Card>
            <Card.Body>
              <Card.Title>Passos</Card.Title>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stepsChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="steps" fill="#16a34a" name="Passos" />
                </BarChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
      )}

      {energyChart.length > 0 && (
        <Col md={6} className="mb-4">
          <Card>
            <Card.Body>
              <Card.Title>Calorias Ativas (kcal)</Card.Title>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={energyChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="kcal" fill="#f59e42" name="kcal" />
                </BarChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
      )}

      {sleepChart.length > 0 && (
        <Col md={6} className="mb-4">
          <Card>
            <Card.Body>
              <Card.Title>Sono (horas)</Card.Title>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={sleepChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="total" fill="#7c3aed" name="Total" />
                  <Bar dataKey="deep" fill="#3b82f6" name="Profundo" />
                  <Bar dataKey="rem" fill="#f59e42" name="REM" />
                </BarChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
      )}

      {hrChart.length > 0 && (
        <Col md={6} className="mb-4">
          <Card>
            <Card.Body>
              <Card.Title>Frequência Cardíaca (bpm)</Card.Title>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={hrChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="avg" stroke="#f43f5e" name="Média" />
                  <Line type="monotone" dataKey="min" stroke="#0ea5e9" name="Mín" strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="max" stroke="#ef4444" name="Máx" strokeDasharray="3 3" />
                </LineChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
      )}

      {distanceChart.length > 0 && (
        <Col md={6} className="mb-4">
          <Card>
            <Card.Body>
              <Card.Title>Distância (km)</Card.Title>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={distanceChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="km" fill="#0ea5e9" name="km" />
                </BarChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
      )}

      {weightChart.length > 0 && (
        <Col md={6} className="mb-4">
          <Card>
            <Card.Body>
              <Card.Title>Peso (kg)</Card.Title>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={weightChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis domain={['auto', 'auto']} />
                  <Tooltip />
                  <Line type="monotone" dataKey="kg" stroke="#a21caf" name="Peso" />
                </LineChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
      )}

      {(data.workouts || []).length > 0 && (
        <Col md={12} className="mb-4">
          <Card>
            <Card.Body>
              <Card.Title>Treinos Recentes</Card.Title>
              <div className="table-responsive">
                <table className="table table-sm">
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

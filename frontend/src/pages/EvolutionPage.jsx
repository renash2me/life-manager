import { useState, useEffect, useMemo } from 'react'
import { Card, Spinner, ButtonGroup, ToggleButton } from 'react-bootstrap'
import {
  LineChart, Line, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'
import { api } from '../api/client'
import { fmtDateShort } from '../utils/date'

const GRID_STROKE = 'rgba(255,255,255,0.06)'
const TICK_STYLE = { fill: '#94a3b8', fontSize: 11 }
const TOOLTIP_STYLE = {
  backgroundColor: '#1a1d28',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  color: '#e2e8f0',
}

const PERIOD_OPTIONS = [
  { label: '3m', value: 90 },
  { label: '6m', value: 180 },
  { label: '1a', value: 365 },
  { label: 'Tudo', value: 9999 },
]

function EvolutionPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(365)
  const [selected, setSelected] = useState(['steps'])

  useEffect(() => {
    setLoading(true)
    api.getEvolution(days)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [days])

  // Auto-select first available metric if current selection has no data
  useEffect(() => {
    if (data?.available?.length > 0 && selected.length === 0) {
      setSelected([data.available[0].key])
    }
  }, [data])

  const toggleMetric = (key) => {
    setSelected((prev) => {
      if (prev.includes(key)) {
        return prev.length > 1 ? prev.filter((k) => k !== key) : prev
      }
      return [...prev, key]
    })
  }

  // Build merged chart data: normalize all metrics to 0-100 scale for comparison
  const chartData = useMemo(() => {
    if (!data?.metrics) return []

    // Collect all unique dates
    const dateSet = new Set()
    selected.forEach((key) => {
      (data.metrics[key] || []).forEach((d) => dateSet.add(d.date))
    })
    const dates = [...dateSet].sort()

    // Build lookup per metric
    const lookups = {}
    selected.forEach((key) => {
      const map = {}
      ;(data.metrics[key] || []).forEach((d) => { map[d.date] = d.value })
      lookups[key] = map
    })

    return dates.map((date) => {
      const point = { date: fmtDateShort(date) }
      selected.forEach((key) => {
        point[key] = lookups[key][date] ?? null
      })
      return point
    })
  }, [data, selected])

  // Get info about selected metrics
  const metricInfo = useMemo(() => {
    if (!data?.available) return {}
    const map = {}
    data.available.forEach((m) => { map[m.key] = m })
    return map
  }, [data])

  if (loading) {
    return <div className="text-center mt-5"><Spinner animation="border" /></div>
  }

  if (!data || !data.available?.length) {
    return (
      <Card className="text-center p-5">
        <Card.Body>
          <h5 className="text-muted">Nenhum dado de saude disponivel</h5>
          <p className="text-muted">Aguarde dados serem importados do Apple Health.</p>
        </Card.Body>
      </Card>
    )
  }

  // Check if selected metrics have very different scales (need dual Y axis)
  const needsDualAxis = selected.length === 2
  const leftKey = selected[0]
  const rightKey = selected.length === 2 ? selected[1] : null

  return (
    <>
      <h4 className="lm-section-header mb-4">Evolucao</h4>
      <p className="text-muted mb-3">
        Selecione metricas para comparar no mesmo grafico.
      </p>

      <div className="d-flex flex-wrap gap-2 mb-3">
        {data.available.map((m) => (
          <button
            key={m.key}
            className={`lm-metric-toggle ${selected.includes(m.key) ? 'lm-metric-toggle--active' : ''}`}
            onClick={() => toggleMetric(m.key)}
            style={selected.includes(m.key) ? { borderColor: m.color, backgroundColor: `${m.color}20` } : undefined}
          >
            <span className="lm-metric-toggle__dot" style={{ backgroundColor: m.color }} />
            {m.label}
          </button>
        ))}
      </div>

      <div className="d-flex justify-content-end mb-3">
        <ButtonGroup className="lm-period-selector">
          {PERIOD_OPTIONS.map((opt) => (
            <ToggleButton
              key={opt.value}
              id={`evo-period-${opt.value}`}
              type="radio"
              variant="outline-secondary"
              name="evo-period"
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
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={TICK_STYLE} />
                <YAxis
                  yAxisId="left"
                  domain={['auto', 'auto']}
                  tick={TICK_STYLE}
                  label={leftKey && metricInfo[leftKey] ? { value: metricInfo[leftKey].unit, angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11 } : undefined}
                />
                {rightKey && (
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={['auto', 'auto']}
                    tick={TICK_STYLE}
                    label={metricInfo[rightKey] ? { value: metricInfo[rightKey].unit, angle: 90, position: 'insideRight', fill: '#94a3b8', fontSize: 11 } : undefined}
                  />
                )}
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
                {selected.map((key, i) => (
                  <Line
                    key={key}
                    yAxisId={needsDualAxis && i === 1 ? 'right' : 'left'}
                    type="monotone"
                    dataKey={key}
                    stroke={metricInfo[key]?.color || '#7c3aed'}
                    name={metricInfo[key]?.label || key}
                    dot={false}
                    strokeWidth={2}
                    connectNulls
                  />
                ))}
              </LineChart>
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

      {selected.length > 2 && (
        <div className="text-muted small text-center mb-3">
          Com mais de 2 metricas, todas usam o eixo Y esquerdo. Para melhor comparacao, selecione ate 2 metricas.
        </div>
      )}
    </>
  )
}

export default EvolutionPage

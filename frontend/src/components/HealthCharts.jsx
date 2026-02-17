import { Row, Col, Card } from 'react-bootstrap'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'
import { fmtDateShort } from '../utils/date'

const GRID_STROKE = 'rgba(255,255,255,0.06)'
const TICK_STYLE = { fill: '#94a3b8', fontSize: 11 }
const TOOLTIP_STYLE = {
  backgroundColor: '#1a1d28',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  color: '#e2e8f0',
}
const CHART_HEIGHT = 280

function FavoriteStar({ chartKey, favorites, onToggle }) {
  const isFav = (favorites || []).includes(chartKey)
  return (
    <span
      className={`lm-fav-star ${isFav ? 'lm-fav-star--active' : ''}`}
      onClick={(e) => { e.stopPropagation(); onToggle(chartKey) }}
      title={isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
    >
      {isFav ? '\u2605' : '\u2606'}
    </span>
  )
}

function ChartCard({ chartKey, title, favorites, onToggleFavorite, children }) {
  return (
    <Card className="lm-chart-card">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center mb-2">
          <Card.Title className="mb-0">{title}</Card.Title>
          <FavoriteStar chartKey={chartKey} favorites={favorites} onToggle={onToggleFavorite} />
        </div>
        {children}
      </Card.Body>
    </Card>
  )
}

// --- Helpers ---

const toHours = (v) => {
  if (!v) return 0
  const n = Number(v)
  return n > 24 ? +(n / 3600).toFixed(2) : +n.toFixed(2)
}

const fmtSleep = (val) => {
  const h = Math.floor(val)
  const m = Math.round((val - h) * 60)
  return `${String(h).padStart(2, '0')}h${String(m).padStart(2, '0')}`
}

// Known field mappings for backward-compatible data from backend
const KNOWN_VALUE_FIELD = {
  steps: 'qty',
  activeEnergy: 'kcal',
  distance: 'km',
  mindfulness: 'minutes',
  weight: 'qty',
  vo2max: 'qty',
  restingHeartRate: 'avg',
}

// Get the numeric value from a data point, handling both legacy and generic formats
function getDataValue(d, metricKey) {
  const field = KNOWN_VALUE_FIELD[metricKey]
  if (field && d[field] != null) return Number(d[field])
  if (d.value != null) return Number(d.value)
  if (d.qty != null) return Number(d.qty)
  return 0
}

// --- Special renderers for complex charts ---

function SleepChart({ data }) {
  const chartData = (data || []).map((d) => ({
    date: fmtDateShort(d.date),
    total: toHours(d.asleep || d.totalSleep),
    deep: toHours(d.deep),
    rem: toHours(d.rem),
  }))
  if (!chartData.length) return null
  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <BarChart data={chartData}>
        <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={TICK_STYLE} />
        <YAxis tick={TICK_STYLE} tickFormatter={fmtSleep} />
        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(val) => fmtSleep(val)} />
        <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
        <Bar dataKey="total" fill="#7c3aed" name="Total" radius={[4, 4, 0, 0]} />
        <Bar dataKey="deep" fill="#3b82f6" name="Profundo" radius={[4, 4, 0, 0]} />
        <Bar dataKey="rem" fill="#f59e42" name="REM" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function HeartRateChart({ data }) {
  const chartData = (data || []).map((d) => ({
    date: fmtDateShort(d.date),
    avg: d.Avg || d.avg || d.value,
    min: d.Min || d.min,
    max: d.Max || d.max,
  }))
  if (!chartData.length) return null
  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <LineChart data={chartData}>
        <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={TICK_STYLE} />
        <YAxis tick={TICK_STYLE} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
        <Line type="monotone" dataKey="avg" stroke="#f43f5e" name="Media" dot={false} strokeWidth={2} />
        <Line type="monotone" dataKey="min" stroke="#0ea5e9" name="Min" dot={false} strokeDasharray="4 4" />
        <Line type="monotone" dataKey="max" stroke="#ef4444" name="Max" dot={false} strokeDasharray="4 4" />
      </LineChart>
    </ResponsiveContainer>
  )
}

function WorkoutsTable({ data }) {
  if (!(data || []).length) return null
  return (
    <div className="table-responsive">
      <table className="table table-sm lm-table">
        <thead>
          <tr><th>Data</th><th>Treino</th><th>Duracao</th></tr>
        </thead>
        <tbody>
          {data.map((w, i) => (
            <tr key={i}>
              <td>{w.startTime ? new Date(w.startTime).toLocaleDateString('pt-BR') : '--'}</td>
              <td>{w.name}</td>
              <td>{w.duration ? `${Math.round(w.duration / 60)} min` : '--'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// --- Generic chart renderer ---

function GenericBarChart({ data, metricKey, color, label }) {
  const chartData = (data || []).map((d) => ({
    date: fmtDateShort(d.date),
    value: getDataValue(d, metricKey),
  })).filter((d) => d.value)
  if (!chartData.length) return null
  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <BarChart data={chartData}>
        <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={TICK_STYLE} />
        <YAxis tick={TICK_STYLE} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Bar dataKey="value" fill={color} name={label} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function GenericLineChart({ data, metricKey, color, label }) {
  const chartData = (data || []).map((d) => ({
    date: fmtDateShort(d.date),
    value: getDataValue(d, metricKey),
  })).filter((d) => d.value)
  if (!chartData.length) return null
  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <LineChart data={chartData}>
        <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={TICK_STYLE} />
        <YAxis domain={['auto', 'auto']} tick={TICK_STYLE} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Line type="monotone" dataKey="value" stroke={color} name={label} dot={false} strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  )
}

// --- Sections for known metrics ---

const KNOWN_SECTIONS = [
  { key: 'atividade', label: 'Atividade Fisica', icon: '\uD83C\uDFCB\uFE0F', charts: ['steps', 'activeEnergy', 'distance', 'workouts'] },
  { key: 'sono', label: 'Sono & Recuperacao', icon: '\uD83C\uDF1C', charts: ['sleep'] },
  { key: 'saude', label: 'Saude', icon: '\u2764\uFE0F', charts: ['heartRate', 'restingHeartRate', 'weight', 'vo2max'] },
  { key: 'mente', label: 'Mente', icon: '\uD83E\uDDD8', charts: ['mindfulness'] },
]

const ALL_KNOWN_KEYS = new Set(KNOWN_SECTIONS.flatMap((s) => s.charts))

// Determine chart type for a metric
function getChartType(metricKey, meta) {
  if (metricKey === 'sleep') return 'sleep'
  if (metricKey === 'heartRate') return 'heartRate'
  if (metricKey === 'workouts') return 'workouts'
  if (!meta) return 'bar'
  const agg = meta.agg || 'sum'
  if (agg === 'hr' || agg === 'latest') return 'line'
  return 'bar'
}

function renderMetricChart(chartKey, data, meta) {
  const metricData = data[chartKey]
  if (!metricData || (Array.isArray(metricData) && !metricData.length)) return null

  const label = meta?.label || chartKey
  const color = meta?.color || '#7c3aed'
  const chartType = getChartType(chartKey, meta)

  switch (chartType) {
    case 'sleep':
      return <SleepChart data={metricData} />
    case 'heartRate':
      return <HeartRateChart data={metricData} />
    case 'workouts':
      return <WorkoutsTable data={metricData} />
    case 'line':
      return <GenericLineChart data={metricData} metricKey={chartKey} color={color} label={label} />
    default:
      return <GenericBarChart data={metricData} metricKey={chartKey} color={color} label={label} />
  }
}

function getChartTitle(chartKey, meta) {
  if (!meta) return chartKey
  const unit = meta.unit
  return unit ? `${meta.label} (${unit})` : meta.label
}

function renderChartCol(chartKey, data, meta, favorites, onToggleFavorite) {
  const content = renderMetricChart(chartKey, data, meta)
  if (!content) return null

  const colSize = chartKey === 'workouts' ? 12 : 6
  return (
    <Col md={colSize} className="mb-4" key={chartKey}>
      <ChartCard
        chartKey={chartKey}
        title={getChartTitle(chartKey, meta)}
        favorites={favorites}
        onToggleFavorite={onToggleFavorite}
      >
        {content}
      </ChartCard>
    </Col>
  )
}

function HealthCharts({ data, favorites, onToggleFavorite }) {
  if (!data) return null

  const favList = favorites || []
  const meta = data._metricsMeta || {}

  // Find discovered metrics (not in known sections)
  const discoveredKeys = Object.keys(data)
    .filter((k) => !k.startsWith('_') && k !== 'workouts' && !ALL_KNOWN_KEYS.has(k))
    .filter((k) => Array.isArray(data[k]) && data[k].length > 0)

  // Favorites section
  const favCharts = favList
    .map((key) => renderChartCol(key, data, meta[key], favList, onToggleFavorite))
    .filter(Boolean)

  return (
    <>
      {favCharts.length > 0 && (
        <>
          <div className="lm-section-divider">
            <span className="lm-section-divider__icon">{'\u2B50'}</span>
            <span className="lm-section-divider__label">Favoritos</span>
          </div>
          <Row>{favCharts}</Row>
        </>
      )}

      {KNOWN_SECTIONS.map((section) => {
        const sectionCharts = section.charts
          .filter((key) => !favList.includes(key))
          .map((key) => renderChartCol(key, data, meta[key], favList, onToggleFavorite))
          .filter(Boolean)

        if (!sectionCharts.length) return null

        return (
          <div key={section.key}>
            <div className="lm-section-divider">
              <span className="lm-section-divider__icon">{section.icon}</span>
              <span className="lm-section-divider__label">{section.label}</span>
            </div>
            <Row>{sectionCharts}</Row>
          </div>
        )
      })}

      {discoveredKeys.length > 0 && (
        <div>
          <div className="lm-section-divider">
            <span className="lm-section-divider__icon">{'\u{1F4CA}'}</span>
            <span className="lm-section-divider__label">Outras Metricas</span>
          </div>
          <Row>
            {discoveredKeys
              .filter((key) => !favList.includes(key))
              .map((key) => renderChartCol(key, data, meta[key], favList, onToggleFavorite))
              .filter(Boolean)
            }
          </Row>
        </div>
      )}
    </>
  )
}

export default HealthCharts

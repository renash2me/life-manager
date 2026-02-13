import { Row, Col, Card } from 'react-bootstrap'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'
import { fmtDate, fmtDateShort } from '../utils/date'

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

// --- Chart renderers ---

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

const CHART_RENDERERS = {
  steps: (data) => {
    const chartData = (data.steps || []).map((d) => ({ date: d.date, steps: d.qty }))
    if (!chartData.length) return null
    return (
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <BarChart data={chartData}>
          <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={TICK_STYLE} tickFormatter={fmtDateShort} />
          <YAxis tick={TICK_STYLE} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Bar dataKey="steps" fill="#16a34a" name="Passos" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    )
  },
  activeEnergy: (data) => {
    const chartData = (data.activeEnergy || []).map((d) => ({ date: d.date, kcal: d.kcal }))
    if (!chartData.length) return null
    return (
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <BarChart data={chartData}>
          <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={TICK_STYLE} tickFormatter={fmtDateShort} />
          <YAxis tick={TICK_STYLE} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Bar dataKey="kcal" fill="#f59e42" name="kcal" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    )
  },
  distance: (data) => {
    const chartData = (data.distance || []).map((d) => ({ date: d.date, km: d.km }))
    if (!chartData.length) return null
    return (
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <BarChart data={chartData}>
          <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={TICK_STYLE} tickFormatter={fmtDateShort} />
          <YAxis tick={TICK_STYLE} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Bar dataKey="km" fill="#0ea5e9" name="km" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    )
  },
  workouts: (data) => {
    if (!(data.workouts || []).length) return null
    return (
      <div className="table-responsive">
        <table className="table table-sm lm-table">
          <thead>
            <tr><th>Data</th><th>Treino</th><th>Duracao</th></tr>
          </thead>
          <tbody>
            {data.workouts.map((w, i) => (
              <tr key={i}>
                <td>{w.startTime ? fmtDate(w.startTime) : '--'}</td>
                <td>{w.name}</td>
                <td>{w.duration ? `${Math.round(w.duration / 60)} min` : '--'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  },
  sleep: (data) => {
    const chartData = (data.sleep || []).map((d) => ({
      date: d.date.slice(0, 10),
      total: toHours(d.asleep || d.totalSleep),
      deep: toHours(d.deep),
      rem: toHours(d.rem),
    }))
    if (!chartData.length) return null
    return (
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <BarChart data={chartData}>
          <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={TICK_STYLE} tickFormatter={fmtDateShort} />
          <YAxis tick={TICK_STYLE} tickFormatter={fmtSleep} />
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(val) => fmtSleep(val)} />
          <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
          <Bar dataKey="total" fill="#7c3aed" name="Total" radius={[4, 4, 0, 0]} />
          <Bar dataKey="deep" fill="#3b82f6" name="Profundo" radius={[4, 4, 0, 0]} />
          <Bar dataKey="rem" fill="#f59e42" name="REM" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    )
  },
  heartRate: (data) => {
    const chartData = (data.heartRate || []).map((d) => ({ date: d.date, avg: d.Avg, min: d.Min, max: d.Max }))
    if (!chartData.length) return null
    return (
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <LineChart data={chartData}>
          <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={TICK_STYLE} tickFormatter={fmtDateShort} />
          <YAxis tick={TICK_STYLE} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
          <Line type="monotone" dataKey="avg" stroke="#f43f5e" name="Media" dot={false} strokeWidth={2} />
          <Line type="monotone" dataKey="min" stroke="#0ea5e9" name="Min" dot={false} strokeDasharray="4 4" />
          <Line type="monotone" dataKey="max" stroke="#ef4444" name="Max" dot={false} strokeDasharray="4 4" />
        </LineChart>
      </ResponsiveContainer>
    )
  },
  weight: (data) => {
    const chartData = (data.weight || []).map((d) => ({ date: d.date.slice(0, 10), kg: d.qty ? +Number(d.qty).toFixed(1) : 0 }))
    if (!chartData.length) return null
    return (
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <LineChart data={chartData}>
          <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={TICK_STYLE} tickFormatter={fmtDateShort} />
          <YAxis domain={['auto', 'auto']} tick={TICK_STYLE} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Line type="monotone" dataKey="kg" stroke="#a21caf" name="Peso" dot={false} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    )
  },
  mindfulness: (data) => {
    const chartData = (data.mindfulness || []).map((d) => ({ date: d.date, minutes: d.minutes }))
    if (!chartData.length) return null
    return (
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <BarChart data={chartData}>
          <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={TICK_STYLE} tickFormatter={fmtDateShort} />
          <YAxis tick={TICK_STYLE} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Bar dataKey="minutes" fill="#a855f7" name="Minutos" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    )
  },
}

const CHART_TITLES = {
  steps: 'Passos',
  activeEnergy: 'Calorias Ativas (kcal)',
  distance: 'Distancia (km)',
  workouts: 'Treinos Recentes',
  sleep: 'Sono',
  heartRate: 'Frequencia Cardiaca (bpm)',
  weight: 'Peso (kg)',
  mindfulness: 'Meditacao (min)',
}

const SECTIONS = [
  { key: 'atividade', label: 'Atividade Fisica', icon: '\uD83C\uDFCB\uFE0F', charts: ['steps', 'activeEnergy', 'distance', 'workouts'] },
  { key: 'sono', label: 'Sono & Recuperacao', icon: '\uD83C\uDF1C', charts: ['sleep'] },
  { key: 'saude', label: 'Saude', icon: '\u2764\uFE0F', charts: ['heartRate', 'weight'] },
  { key: 'mente', label: 'Mente', icon: '\uD83E\uDDD8', charts: ['mindfulness'] },
]

function renderChart(chartKey, data, favorites, onToggleFavorite) {
  const renderer = CHART_RENDERERS[chartKey]
  if (!renderer) return null
  const content = renderer(data)
  if (!content) return null

  const colSize = chartKey === 'workouts' ? 12 : 6
  return (
    <Col md={colSize} className="mb-4" key={chartKey}>
      <ChartCard
        chartKey={chartKey}
        title={CHART_TITLES[chartKey]}
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

  // Favorites section
  const favCharts = favList
    .map((key) => renderChart(key, data, favList, onToggleFavorite))
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

      {SECTIONS.map((section) => {
        const sectionCharts = section.charts
          .filter((key) => !favList.includes(key))
          .map((key) => renderChart(key, data, favList, onToggleFavorite))
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
    </>
  )
}

export default HealthCharts

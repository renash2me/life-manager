import { useState, useEffect } from 'react'
import { Card, Spinner, ProgressBar, Button, Modal, Form, Row, Col } from 'react-bootstrap'
import { api } from '../api/client'
import { fmtDate } from '../utils/date'

const METRIC_LABELS = {
  steps: 'Passos', activeEnergy: 'Calorias', distance: 'Distancia',
  weight: 'Peso', sleep: 'Sono', restingHeartRate: 'FC Repouso',
  mindfulness: 'Meditacao', vo2max: 'VO2 Max',
}
const METRIC_UNITS = {
  steps: 'passos', activeEnergy: 'kcal', distance: 'km',
  weight: 'kg', sleep: 'h', restingHeartRate: 'bpm',
  mindfulness: 'min', vo2max: 'mL/min.kg',
}
const PERIOD_LABELS = { daily: 'Diaria', weekly: 'Semanal', monthly: 'Mensal', annual: 'Anual' }

function progressVariant(pct, metricKey) {
  if (metricKey === 'weight') {
    if (pct >= 100) return 'success'
    if (pct >= 60) return 'warning'
    return 'danger'
  }
  if (pct >= 100) return 'success'
  if (pct >= 80) return 'info'
  if (pct >= 50) return 'warning'
  return 'danger'
}

function MetricGoalRow({ goal }) {
  const label = goal.metricKey ? (METRIC_LABELS[goal.metricKey] || goal.metricKey) : ''
  const unit = goal.metricKey ? (METRIC_UNITS[goal.metricKey] || '') : ''
  const current = goal.currentValue !== null && goal.currentValue !== undefined ? goal.currentValue : '--'
  const pct = goal.progress || 0
  const variant = progressVariant(pct, goal.metricKey)

  return (
    <div className="lm-goal-row mb-2">
      <div className="d-flex justify-content-between align-items-center mb-1">
        <span className="small">
          <strong>{goal.description || label}</strong>
          <span className="text-muted ms-2">{PERIOD_LABELS[goal.periodType]}</span>
        </span>
        <span className="small">
          <strong>{current}</strong>
          {goal.targetValue && <span className="text-muted"> / {goal.targetValue} {unit}</span>}
        </span>
      </div>
      <ProgressBar
        now={Math.min(pct, 100)}
        variant={variant}
        style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.08)' }}
      />
    </div>
  )
}

function CheckGoalRow({ goal, onToggle, loading }) {
  const checked = goal.checkedToday
  return (
    <div
      className={`lm-check-row d-flex align-items-center gap-2 py-2 px-3 mb-1 ${checked ? 'lm-check-row--done' : ''}`}
      onClick={() => !loading && onToggle(goal.id, checked)}
      style={{ cursor: loading ? 'wait' : 'pointer' }}
    >
      <span className={`lm-checkbox ${checked ? 'lm-checkbox--checked' : ''}`}>
        {checked ? '\u2713' : ''}
      </span>
      <span className={`small flex-grow-1 ${checked ? 'text-decoration-line-through text-muted' : ''}`}>
        {goal.description}
      </span>
      <span className="small text-muted">{PERIOD_LABELS[goal.periodType]}</span>
      {checked && <span className="small text-success fw-bold">+XP</span>}
    </div>
  )
}

function MainGoalCard({ goal }) {
  if (goal.goalType === 'metric' && goal.metricKey) {
    return <MetricGoalRow goal={goal} />
  }
  return (
    <div className="d-flex align-items-center gap-2 mb-2">
      <span className={`small ${goal.checkedToday ? 'text-decoration-line-through text-muted' : ''}`}>
        {goal.description}
      </span>
    </div>
  )
}

function PhaseCard({ phase, onToggle, loadingId, expanded, onExpand }) {
  const borderColor = phase.status === 'active' ? 'var(--lm-accent-blue)' :
                      phase.status === 'past' ? 'var(--lm-accent-green)' : 'var(--lm-border)'
  const bgColor = phase.status === 'active' ? 'rgba(14, 165, 233, 0.06)' :
                  phase.status === 'past' ? 'rgba(22, 163, 74, 0.04)' : 'transparent'
  const dotColor = phase.status === 'active' ? 'var(--lm-accent-blue)' :
                   phase.status === 'past' ? 'var(--lm-accent-green)' : '#475569'

  const metricGoals = (phase.goals || []).filter((g) => g.goalType === 'metric')
  const checkGoals = (phase.goals || []).filter((g) => g.goalType === 'check')
  const dailyChecks = checkGoals.filter((g) => g.periodType === 'daily')
  const otherChecks = checkGoals.filter((g) => g.periodType !== 'daily')

  return (
    <Card className="mb-3" style={{ borderColor, backgroundColor: bgColor }}>
      <Card.Body className="py-3">
        <div
          className="d-flex justify-content-between align-items-center mb-2"
          onClick={onExpand}
          style={{ cursor: 'pointer' }}
        >
          <span className="d-flex align-items-center gap-2">
            <span className="lm-phase-dot" style={{ backgroundColor: dotColor }} />
            <strong className="small">{phase.name}</strong>
            {phase.status === 'active' && <span className="badge bg-primary" style={{ fontSize: '0.65rem' }}>Ativa</span>}
          </span>
          <small className="text-muted">
            {fmtDate(phase.startDate)} - {fmtDate(phase.endDate)}
          </small>
        </div>

        <ProgressBar
          now={phase.progress}
          variant={phase.status === 'active' ? 'info' : phase.status === 'past' ? 'success' : 'secondary'}
          style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.08)' }}
          className="mb-2"
        />

        {expanded && (
          <>
            {phase.description && <small className="text-muted d-block mb-3">{phase.description}</small>}

            {metricGoals.length > 0 && (
              <div className="mb-3">
                <h6 className="text-muted text-uppercase small mb-2">Metas da Fase</h6>
                {metricGoals.map((g) => <MetricGoalRow key={g.id} goal={g} />)}
              </div>
            )}

            {dailyChecks.length > 0 && (
              <div className="mb-3">
                <h6 className="text-muted text-uppercase small mb-2">Checklist Diario</h6>
                {dailyChecks.map((g) => (
                  <CheckGoalRow
                    key={g.id}
                    goal={g}
                    onToggle={onToggle}
                    loading={loadingId === g.id}
                  />
                ))}
              </div>
            )}

            {otherChecks.length > 0 && (
              <div>
                <h6 className="text-muted text-uppercase small mb-2">Metas Checaveis</h6>
                {otherChecks.map((g) => (
                  <CheckGoalRow
                    key={g.id}
                    goal={g}
                    onToggle={onToggle}
                    loading={loadingId === g.id}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {!expanded && (phase.goals || []).length > 0 && (
          <small className="text-muted">{phase.goals.length} metas - clique para expandir</small>
        )}
      </Card.Body>
    </Card>
  )
}

function GoalForm({ show, onHide, onSave, phases }) {
  const [form, setForm] = useState({
    goalType: 'check', periodType: 'daily', phaseId: '',
    metricKey: '', targetValue: '', description: '',
    startDate: '', endDate: '',
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    const data = {
      goalType: form.goalType,
      periodType: form.periodType,
      phaseId: form.phaseId ? parseInt(form.phaseId) : null,
      description: form.description,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
    }
    if (form.goalType === 'metric') {
      data.metricKey = form.metricKey
      data.targetValue = parseFloat(form.targetValue)
    }
    onSave(data)
    onHide()
  }

  return (
    <Modal show={show} onHide={onHide} data-bs-theme="dark">
      <Modal.Header closeButton><Modal.Title>Nova Meta</Modal.Title></Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Tipo</Form.Label>
            <Form.Select value={form.goalType} onChange={(e) => setForm({ ...form, goalType: e.target.value })}>
              <option value="check">Checavel (marcar manualmente)</option>
              <option value="metric">Metrica (auto-calculado)</option>
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Fase (opcional)</Form.Label>
            <Form.Select value={form.phaseId} onChange={(e) => setForm({ ...form, phaseId: e.target.value })}>
              <option value="">Meta global (sem fase)</option>
              {(phases || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Periodo</Form.Label>
            <Form.Select value={form.periodType} onChange={(e) => setForm({ ...form, periodType: e.target.value })}>
              {Object.entries(PERIOD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Form.Select>
          </Form.Group>
          {form.goalType === 'metric' && (
            <Row>
              <Col>
                <Form.Group className="mb-3">
                  <Form.Label>Metrica</Form.Label>
                  <Form.Select value={form.metricKey} onChange={(e) => setForm({ ...form, metricKey: e.target.value })}>
                    <option value="">Selecione...</option>
                    {Object.entries(METRIC_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col>
                <Form.Group className="mb-3">
                  <Form.Label>Valor Alvo</Form.Label>
                  <Form.Control type="number" step="0.1" value={form.targetValue} onChange={(e) => setForm({ ...form, targetValue: e.target.value })} />
                </Form.Group>
              </Col>
            </Row>
          )}
          <Form.Group className="mb-3">
            <Form.Label>Descricao</Form.Label>
            <Form.Control required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Form.Group>
          <Row>
            <Col><Form.Group className="mb-3"><Form.Label>Inicio</Form.Label><Form.Control type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></Form.Group></Col>
            <Col><Form.Group className="mb-3"><Form.Label>Fim</Form.Label><Form.Control type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></Form.Group></Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>Cancelar</Button>
          <Button variant="primary" type="submit">Criar</Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}

function GoalsPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingId, setLoadingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [expanded, setExpanded] = useState({})

  const loadData = () => {
    return api.getGoals().then((result) => {
      setData(result)
      // Auto-expand active phase
      const activePhase = (result.phases || []).find((p) => p.status === 'active')
      if (activePhase) {
        setExpanded((prev) => ({ ...prev, [activePhase.id]: true }))
      }
    })
  }

  useEffect(() => {
    loadData().catch(console.error).finally(() => setLoading(false))
  }, [])

  const handleToggle = async (goalId, isChecked) => {
    setLoadingId(goalId)
    try {
      if (isChecked) {
        await api.uncheckGoal(goalId)
      } else {
        await api.checkGoal(goalId)
      }
      await loadData()
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingId(null)
    }
  }

  const handleCreate = (goalData) => {
    api.createGoal(goalData).then(() => loadData()).catch(console.error)
  }

  if (loading) {
    return <div className="text-center mt-5"><Spinner animation="border" /></div>
  }

  if (!data) {
    return <Card className="text-center p-5"><Card.Body><p className="text-muted">Erro ao carregar metas.</p></Card.Body></Card>
  }

  const mainGoals = data.mainGoals || []
  const phases = data.phases || []
  const annualMetrics = mainGoals.filter((g) => g.goalType === 'metric')
  const mainChecks = mainGoals.filter((g) => g.goalType === 'check')

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="lm-section-header mb-0">Metas & Fases</h4>
        <Button variant="outline-primary" size="sm" onClick={() => setShowForm(true)}>+ Meta</Button>
      </div>

      {/* Main Goals */}
      {mainGoals.length > 0 && (
        <Card className="mb-4" style={{ borderColor: 'var(--lm-accent-gold)', backgroundColor: 'rgba(250, 204, 21, 0.04)' }}>
          <Card.Body>
            {mainChecks.length > 0 && (
              <div className="mb-3">
                <h6 className="text-muted text-uppercase small mb-2">Meta Principal</h6>
                {mainChecks.map((g) => <MainGoalCard key={g.id} goal={g} />)}
              </div>
            )}
            {annualMetrics.length > 0 && (
              <div>
                <h6 className="text-muted text-uppercase small mb-2">Metas Anuais</h6>
                {annualMetrics.map((g) => <MetricGoalRow key={g.id} goal={g} />)}
              </div>
            )}
          </Card.Body>
        </Card>
      )}

      {/* Phases */}
      {phases.length > 0 ? (
        <div className="lm-section-divider mb-3">
          <span className="lm-section-divider__icon">&#x1F3AF;</span>
          <span className="lm-section-divider__label">Fases do Projeto</span>
        </div>
      ) : (
        <Card className="text-center p-4 mb-4">
          <Card.Body>
            <p className="text-muted mb-0">
              Nenhuma fase cadastrada. Execute <code>flask seed-goals</code> para popular as metas do Projeto Travessia.
            </p>
          </Card.Body>
        </Card>
      )}

      {phases.map((phase) => (
        <PhaseCard
          key={phase.id}
          phase={phase}
          onToggle={handleToggle}
          loadingId={loadingId}
          expanded={!!expanded[phase.id]}
          onExpand={() => setExpanded((prev) => ({ ...prev, [phase.id]: !prev[phase.id] }))}
        />
      ))}

      <GoalForm
        show={showForm}
        onHide={() => setShowForm(false)}
        onSave={handleCreate}
        phases={phases}
      />
    </>
  )
}

export default GoalsPage

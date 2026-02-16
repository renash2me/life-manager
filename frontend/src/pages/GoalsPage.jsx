import { useState, useEffect } from 'react'
import { Row, Col, Card, Spinner, ProgressBar, Button, Modal, Form } from 'react-bootstrap'
import { api } from '../api/client'
import { fmtDate } from '../utils/date'

const METRIC_LABELS = {
  steps: 'Passos',
  activeEnergy: 'Calorias',
  distance: 'Distancia',
  weight: 'Peso',
  sleep: 'Sono',
  restingHeartRate: 'FC Repouso',
  mindfulness: 'Meditacao',
  vo2max: 'VO2 Max',
}

const METRIC_UNITS = {
  steps: 'passos',
  activeEnergy: 'kcal',
  distance: 'km',
  weight: 'kg',
  sleep: 'h',
  restingHeartRate: 'bpm',
  mindfulness: 'min',
  vo2max: 'mL/min.kg',
}

const PERIOD_LABELS = {
  daily: 'Diaria',
  weekly: 'Semanal',
  monthly: 'Mensal',
  annual: 'Anual',
}

function progressColor(pct, metricKey) {
  if (metricKey === 'weight') {
    // For weight, lower progress means closer to goal
    if (pct >= 100) return 'success'
    if (pct >= 60) return 'warning'
    return 'danger'
  }
  if (pct >= 100) return 'success'
  if (pct >= 80) return 'info'
  if (pct >= 50) return 'warning'
  return 'danger'
}

function PhaseTimeline({ phases }) {
  if (!phases?.length) return null

  return (
    <Card className="mb-4">
      <Card.Body>
        <Card.Title className="mb-3">Timeline de Fases</Card.Title>
        <div className="lm-phases-timeline">
          {phases.map((phase) => {
            const borderColor = phase.status === 'active' ? 'var(--lm-accent-blue)' :
                                phase.status === 'past' ? 'var(--lm-accent-green)' : 'var(--lm-border)'
            const bgColor = phase.status === 'active' ? 'rgba(14, 165, 233, 0.08)' :
                            phase.status === 'past' ? 'rgba(22, 163, 74, 0.08)' : 'transparent'
            const dotColor = phase.status === 'active' ? 'var(--lm-accent-blue)' :
                             phase.status === 'past' ? 'var(--lm-accent-green)' : '#475569'

            return (
              <div
                key={phase.id}
                className="lm-phase-card"
                style={{ borderColor, backgroundColor: bgColor }}
              >
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="d-flex align-items-center gap-2">
                    <span className="lm-phase-dot" style={{ backgroundColor: dotColor }} />
                    <strong className="small">{phase.name}</strong>
                  </span>
                  <small className="text-muted">
                    {fmtDate(phase.startDate)} - {fmtDate(phase.endDate)}
                  </small>
                </div>
                {phase.description && (
                  <small className="text-muted d-block mb-1">{phase.description}</small>
                )}
                <ProgressBar
                  now={phase.progress}
                  variant={phase.status === 'active' ? 'info' : phase.status === 'past' ? 'success' : 'secondary'}
                  style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.08)' }}
                  className="mb-2"
                />
                <div className="d-flex flex-wrap gap-1">
                  {(phase.targets || []).map((t, i) => (
                    <span key={i} className="lm-phase-target">{t}</span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </Card.Body>
    </Card>
  )
}

function GoalCard({ goal }) {
  const label = METRIC_LABELS[goal.metricKey] || goal.metricKey
  const unit = METRIC_UNITS[goal.metricKey] || ''
  const current = goal.currentValue !== null && goal.currentValue !== undefined ? goal.currentValue : '--'
  const variant = progressColor(goal.progress, goal.metricKey)

  return (
    <Card className="lm-goal-card mb-2">
      <Card.Body className="py-2 px-3">
        <div className="d-flex justify-content-between align-items-center mb-1">
          <span>
            <strong className="small">{label}</strong>
            {goal.description && (
              <small className="text-muted ms-2">{goal.description}</small>
            )}
          </span>
          <span className="small">
            <strong>{current}</strong>
            <span className="text-muted"> / {goal.targetValue} {unit}</span>
          </span>
        </div>
        <ProgressBar
          now={Math.min(goal.progress, 100)}
          variant={variant}
          style={{ height: 8, backgroundColor: 'rgba(255,255,255,0.08)' }}
        />
        <div className="d-flex justify-content-between mt-1">
          <small className="text-muted">{PERIOD_LABELS[goal.periodType]}</small>
          <small className={`text-${variant}`}>{goal.progress}%</small>
        </div>
      </Card.Body>
    </Card>
  )
}

function GoalForm({ show, onHide, onSave }) {
  const [form, setForm] = useState({
    metricKey: 'steps',
    targetValue: '',
    periodType: 'daily',
    startDate: '',
    endDate: '',
    description: '',
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave({
      ...form,
      targetValue: parseFloat(form.targetValue),
    })
    onHide()
  }

  return (
    <Modal show={show} onHide={onHide} data-bs-theme="dark">
      <Modal.Header closeButton>
        <Modal.Title>Nova Meta</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Metrica</Form.Label>
            <Form.Select value={form.metricKey} onChange={(e) => setForm({ ...form, metricKey: e.target.value })}>
              {Object.entries(METRIC_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Valor Alvo</Form.Label>
            <Form.Control
              type="number"
              step="0.1"
              required
              value={form.targetValue}
              onChange={(e) => setForm({ ...form, targetValue: e.target.value })}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Periodo</Form.Label>
            <Form.Select value={form.periodType} onChange={(e) => setForm({ ...form, periodType: e.target.value })}>
              {Object.entries(PERIOD_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Form.Select>
          </Form.Group>
          <Row>
            <Col>
              <Form.Group className="mb-3">
                <Form.Label>Data Inicio</Form.Label>
                <Form.Control type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              </Form.Group>
            </Col>
            <Col>
              <Form.Group className="mb-3">
                <Form.Label>Data Fim</Form.Label>
                <Form.Control type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
              </Form.Group>
            </Col>
          </Row>
          <Form.Group className="mb-3">
            <Form.Label>Descricao (opcional)</Form.Label>
            <Form.Control value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>Cancelar</Button>
          <Button variant="primary" type="submit">Criar Meta</Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}

function PhaseForm({ show, onHide, onSave }) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    targetsText: '',
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave({
      name: form.name,
      description: form.description,
      startDate: form.startDate,
      endDate: form.endDate,
      targets: form.targetsText.split('\n').map((t) => t.trim()).filter(Boolean),
    })
    onHide()
  }

  return (
    <Modal show={show} onHide={onHide} data-bs-theme="dark">
      <Modal.Header closeButton>
        <Modal.Title>Nova Fase</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Nome</Form.Label>
            <Form.Control required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Descricao</Form.Label>
            <Form.Control value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Form.Group>
          <Row>
            <Col>
              <Form.Group className="mb-3">
                <Form.Label>Data Inicio</Form.Label>
                <Form.Control type="date" required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              </Form.Group>
            </Col>
            <Col>
              <Form.Group className="mb-3">
                <Form.Label>Data Fim</Form.Label>
                <Form.Control type="date" required value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
              </Form.Group>
            </Col>
          </Row>
          <Form.Group className="mb-3">
            <Form.Label>Targets (uma por linha)</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              placeholder={"Peso: 90kg\nPassos: 7k/dia"}
              value={form.targetsText}
              onChange={(e) => setForm({ ...form, targetsText: e.target.value })}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>Cancelar</Button>
          <Button variant="primary" type="submit">Criar Fase</Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}

function GoalsPage() {
  const [goals, setGoals] = useState([])
  const [phases, setPhases] = useState([])
  const [loading, setLoading] = useState(true)
  const [showGoalForm, setShowGoalForm] = useState(false)
  const [showPhaseForm, setShowPhaseForm] = useState(false)

  const loadData = () => {
    return Promise.all([api.getGoals(), api.getPhases()])
      .then(([goalsData, phasesData]) => {
        setGoals(goalsData)
        setPhases(phasesData)
      })
  }

  useEffect(() => {
    loadData()
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleCreateGoal = (data) => {
    api.createGoal(data)
      .then(() => loadData())
      .catch(console.error)
  }

  const handleCreatePhase = (data) => {
    api.createPhase(data)
      .then(() => loadData())
      .catch(console.error)
  }

  const handleDeleteGoal = (id) => {
    if (!window.confirm('Deletar esta meta?')) return
    api.deleteGoal(id)
      .then(() => loadData())
      .catch(console.error)
  }

  const handleDeletePhase = (id) => {
    if (!window.confirm('Deletar esta fase?')) return
    api.deletePhase(id)
      .then(() => loadData())
      .catch(console.error)
  }

  if (loading) {
    return <div className="text-center mt-5"><Spinner animation="border" /></div>
  }

  // Group goals by period
  const goalsByPeriod = {}
  goals.forEach((g) => {
    const key = g.periodType
    if (!goalsByPeriod[key]) goalsByPeriod[key] = []
    goalsByPeriod[key].push(g)
  })

  const periodOrder = ['daily', 'weekly', 'monthly', 'annual']

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="lm-section-header mb-0">Metas & Fases</h4>
        <div className="d-flex gap-2">
          <Button variant="outline-primary" size="sm" onClick={() => setShowGoalForm(true)}>
            + Meta
          </Button>
          <Button variant="outline-secondary" size="sm" onClick={() => setShowPhaseForm(true)}>
            + Fase
          </Button>
        </div>
      </div>

      <PhaseTimeline phases={phases} />

      {goals.length > 0 ? (
        <>
          <div className="lm-section-divider">
            <span className="lm-section-divider__icon">&#x1F3AF;</span>
            <span className="lm-section-divider__label">Metas Ativas</span>
          </div>

          {periodOrder.map((period) => {
            const periodGoals = goalsByPeriod[period]
            if (!periodGoals?.length) return null
            return (
              <div key={period} className="mb-4">
                <h6 className="text-muted text-uppercase small mb-2">
                  {PERIOD_LABELS[period]}s
                </h6>
                {periodGoals.map((g) => (
                  <div key={g.id} className="d-flex align-items-start gap-2">
                    <div className="flex-grow-1">
                      <GoalCard goal={g} />
                    </div>
                    <button
                      className="btn btn-sm text-muted border-0 mt-2"
                      onClick={() => handleDeleteGoal(g.id)}
                      title="Deletar meta"
                    >
                      &#x1F5D1;
                    </button>
                  </div>
                ))}
              </div>
            )
          })}
        </>
      ) : (
        <Card className="text-center p-4 mb-4">
          <Card.Body>
            <p className="text-muted mb-0">
              Nenhuma meta ativa no momento. Clique em "+ Meta" para criar ou execute <code>flask seed-goals</code> para popular com as metas do Projeto Travessia.
            </p>
          </Card.Body>
        </Card>
      )}

      {phases.length > 0 && (
        <>
          <div className="lm-section-divider">
            <span className="lm-section-divider__icon">&#x1F4CB;</span>
            <span className="lm-section-divider__label">Gerenciar Fases</span>
          </div>
          {phases.map((p) => (
            <div key={p.id} className="d-flex align-items-center gap-2 mb-1">
              <span className="small flex-grow-1">
                <strong>{p.name}</strong>
                <span className="text-muted ms-2">
                  {fmtDate(p.startDate)} - {fmtDate(p.endDate)}
                </span>
              </span>
              <button
                className="btn btn-sm text-muted border-0"
                onClick={() => handleDeletePhase(p.id)}
                title="Deletar fase"
              >
                &#x1F5D1;
              </button>
            </div>
          ))}
        </>
      )}

      <GoalForm show={showGoalForm} onHide={() => setShowGoalForm(false)} onSave={handleCreateGoal} />
      <PhaseForm show={showPhaseForm} onHide={() => setShowPhaseForm(false)} onSave={handleCreatePhase} />
    </>
  )
}

export default GoalsPage

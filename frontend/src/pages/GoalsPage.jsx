import { useState, useEffect, useCallback } from 'react'
import { Card, Spinner, ProgressBar, Button, Modal, Form, Row, Col } from 'react-bootstrap'
import { api } from '../api/client'
import { fmtDate } from '../utils/date'

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

function MetricGoalRow({ goal, onEdit, onDelete }) {
  const unit = goal.metricKey ? (goal._metricUnit || '') : ''
  const current = goal.currentValue !== null && goal.currentValue !== undefined ? goal.currentValue : '--'
  const pct = goal.progress || 0
  const variant = progressVariant(pct, goal.metricKey)

  return (
    <div className="lm-goal-row mb-2 position-relative lm-goal-hoverable">
      <div className="d-flex justify-content-between align-items-center mb-1">
        <span className="small">
          <strong>{goal.name}</strong>
          <span className="text-muted ms-2">{PERIOD_LABELS[goal.periodType]}</span>
        </span>
        <span className="d-flex align-items-center gap-2">
          <span className="small">
            <strong>{current}</strong>
            {goal.targetValue && <span className="text-muted"> / {goal.targetValue} {unit}</span>}
          </span>
          <span className="lm-goal-actions">
            {onEdit && <button className="btn btn-link btn-sm p-0 text-muted" onClick={(e) => { e.stopPropagation(); onEdit(goal) }} title="Editar">&#9998;</button>}
            {onDelete && <button className="btn btn-link btn-sm p-0 text-danger" onClick={(e) => { e.stopPropagation(); onDelete(goal.id) }} title="Deletar">&#128465;</button>}
          </span>
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

function CheckGoalRow({ goal, onToggle, loading, onEdit, onDelete }) {
  const checked = goal.checkedToday
  return (
    <div
      className={`lm-check-row d-flex align-items-center gap-2 py-2 px-3 mb-1 lm-goal-hoverable ${checked ? 'lm-check-row--done' : ''}`}
      onClick={() => !loading && onToggle(goal.id, checked)}
      style={{ cursor: loading ? 'wait' : 'pointer' }}
    >
      <span className={`lm-checkbox ${checked ? 'lm-checkbox--checked' : ''}`}>
        {checked ? '\u2713' : ''}
      </span>
      <span className={`small flex-grow-1 ${checked ? 'text-decoration-line-through text-muted' : ''}`}>
        {goal.name}
      </span>
      <span className="small text-muted">{PERIOD_LABELS[goal.periodType]}</span>
      {checked && <span className="small text-success fw-bold">+XP</span>}
      <span className="lm-goal-actions">
        {onEdit && <button className="btn btn-link btn-sm p-0 text-muted" onClick={(e) => { e.stopPropagation(); onEdit(goal) }} title="Editar">&#9998;</button>}
        {onDelete && <button className="btn btn-link btn-sm p-0 text-danger" onClick={(e) => { e.stopPropagation(); onDelete(goal.id) }} title="Deletar">&#128465;</button>}
      </span>
    </div>
  )
}

function GroupGoalHeader({ goal, expanded, onExpand, onEdit, onDelete, onAddChild }) {
  const isPhase = goal.parentId !== null && goal.startDate && goal.endDate
  const borderColor = goal.status === 'active' ? 'var(--lm-accent-blue)' :
                      goal.status === 'past' ? 'var(--lm-accent-green)' :
                      !goal.parentId ? 'var(--lm-accent-gold)' : 'var(--lm-border)'
  const bgColor = goal.status === 'active' ? 'rgba(14, 165, 233, 0.06)' :
                  goal.status === 'past' ? 'rgba(22, 163, 74, 0.04)' :
                  !goal.parentId ? 'rgba(250, 204, 21, 0.04)' : 'transparent'
  const dotColor = goal.status === 'active' ? 'var(--lm-accent-blue)' :
                   goal.status === 'past' ? 'var(--lm-accent-green)' :
                   !goal.parentId ? 'var(--lm-accent-gold)' : '#475569'

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
            <strong className="small">{goal.name}</strong>
            {goal.status === 'active' && <span className="badge bg-primary" style={{ fontSize: '0.65rem' }}>Ativa</span>}
          </span>
          <span className="d-flex align-items-center gap-2">
            {goal.startDate && goal.endDate && (
              <small className="text-muted">
                {fmtDate(goal.startDate)} - {fmtDate(goal.endDate)}
              </small>
            )}
            <span className="lm-goal-actions">
              {onAddChild && <button className="btn btn-link btn-sm p-0 text-primary" onClick={(e) => { e.stopPropagation(); onAddChild(goal.id) }} title="Adicionar sub-meta">+</button>}
              {onEdit && <button className="btn btn-link btn-sm p-0 text-muted" onClick={(e) => { e.stopPropagation(); onEdit(goal) }} title="Editar">&#9998;</button>}
              {onDelete && <button className="btn btn-link btn-sm p-0 text-danger" onClick={(e) => { e.stopPropagation(); onDelete(goal.id) }} title="Deletar">&#128465;</button>}
            </span>
          </span>
        </div>

        {goal.progress !== undefined && goal.progress !== null && (
          <ProgressBar
            now={goal.progress}
            variant={goal.status === 'active' ? 'info' : goal.status === 'past' ? 'success' : 'secondary'}
            style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.08)' }}
            className="mb-2"
          />
        )}

        {expanded && goal.description && (
          <small className="text-muted d-block mb-3">{goal.description}</small>
        )}

        {!expanded && (goal.children || []).length > 0 && (
          <small className="text-muted">{goal.children.length} sub-metas - clique para expandir</small>
        )}
      </Card.Body>
    </Card>
  )
}

function GoalNode({ goal, depth = 0, onToggle, loadingId, expanded, onExpand, onEdit, onDelete, onAddChild, metricUnits }) {
  // Attach metric unit info for display
  const goalWithUnit = { ...goal, _metricUnit: metricUnits[goal.metricKey] || '' }

  if (goal.goalType === 'group') {
    const isExpanded = expanded[goal.id]
    return (
      <div style={{ marginLeft: depth > 0 ? 20 : 0 }}>
        <GroupGoalHeader
          goal={goalWithUnit}
          expanded={isExpanded}
          onExpand={() => onExpand(goal.id)}
          onEdit={onEdit}
          onDelete={onDelete}
          onAddChild={onAddChild}
        />
        {isExpanded && (goal.children || []).map((child) => (
          <GoalNode
            key={child.id}
            goal={child}
            depth={depth + 1}
            onToggle={onToggle}
            loadingId={loadingId}
            expanded={expanded}
            onExpand={onExpand}
            onEdit={onEdit}
            onDelete={onDelete}
            onAddChild={onAddChild}
            metricUnits={metricUnits}
          />
        ))}
      </div>
    )
  }

  if (goal.goalType === 'metric') {
    return (
      <div style={{ marginLeft: depth > 0 ? 20 : 0 }}>
        <MetricGoalRow goal={goalWithUnit} onEdit={onEdit} onDelete={onDelete} />
      </div>
    )
  }

  if (goal.goalType === 'check') {
    return (
      <div style={{ marginLeft: depth > 0 ? 20 : 0 }}>
        <CheckGoalRow
          goal={goalWithUnit}
          onToggle={onToggle}
          loading={loadingId === goal.id}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </div>
    )
  }

  return null
}

function GoalForm({ show, onHide, onSave, availableMetrics, goals, editGoal }) {
  const isEdit = !!editGoal
  const [form, setForm] = useState({
    name: '', goalType: 'check', periodType: 'daily', parentId: '',
    metricKey: '', targetValue: '', description: '',
    startDate: '', endDate: '',
  })

  useEffect(() => {
    if (editGoal) {
      setForm({
        name: editGoal.name || '',
        goalType: editGoal.goalType || 'check',
        periodType: editGoal.periodType || 'daily',
        parentId: editGoal.parentId ? String(editGoal.parentId) : '',
        metricKey: editGoal.metricKey || '',
        targetValue: editGoal.targetValue ? String(editGoal.targetValue) : '',
        description: editGoal.description || '',
        startDate: editGoal.startDate || '',
        endDate: editGoal.endDate || '',
      })
    } else {
      setForm({
        name: '', goalType: 'check', periodType: 'daily', parentId: '',
        metricKey: '', targetValue: '', description: '',
        startDate: '', endDate: '',
      })
    }
  }, [editGoal, show])

  // Flatten tree for parent selector
  const flatGoals = []
  const flatten = (nodes, depth = 0) => {
    for (const g of nodes) {
      if (g.goalType === 'group') {
        flatGoals.push({ id: g.id, name: g.name, depth })
        if (g.children) flatten(g.children, depth + 1)
      }
    }
  }
  flatten(goals || [])

  const handleSubmit = (e) => {
    e.preventDefault()
    const data = {
      name: form.name,
      goalType: form.goalType,
      periodType: form.periodType,
      parentId: form.parentId ? parseInt(form.parentId) : null,
      description: form.description || null,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
    }
    if (form.goalType === 'metric') {
      data.metricKey = form.metricKey
      data.targetValue = parseFloat(form.targetValue)
    }
    onSave(data, editGoal?.id)
    onHide()
  }

  return (
    <Modal show={show} onHide={onHide} data-bs-theme="dark">
      <Modal.Header closeButton>
        <Modal.Title>{isEdit ? 'Editar Meta' : 'Nova Meta'}</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Nome</Form.Label>
            <Form.Control
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex: Passos 7.000/dia"
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Tipo</Form.Label>
            <Form.Select value={form.goalType} onChange={(e) => setForm({ ...form, goalType: e.target.value })}>
              <option value="check">Checavel (marcar manualmente)</option>
              <option value="metric">Metrica (auto-calculado)</option>
              <option value="group">Grupo (agrupa sub-metas)</option>
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Meta pai (opcional)</Form.Label>
            <Form.Select value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })}>
              <option value="">Raiz (sem pai)</option>
              {flatGoals.map((g) => (
                <option key={g.id} value={g.id}>
                  {'  '.repeat(g.depth)}{g.name}
                </option>
              ))}
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
                  <Form.Label>Metrica (Apple Watch)</Form.Label>
                  <Form.Select value={form.metricKey} onChange={(e) => setForm({ ...form, metricKey: e.target.value })}>
                    <option value="">Selecione...</option>
                    {(availableMetrics || []).map((m) => (
                      <option key={m.key} value={m.key}>{m.label} ({m.unit})</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col>
                <Form.Group className="mb-3">
                  <Form.Label>Valor Alvo</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.1"
                    value={form.targetValue}
                    onChange={(e) => setForm({ ...form, targetValue: e.target.value })}
                  />
                </Form.Group>
              </Col>
            </Row>
          )}
          <Form.Group className="mb-3">
            <Form.Label>Descricao (opcional)</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Form.Group>
          <Row>
            <Col>
              <Form.Group className="mb-3">
                <Form.Label>Inicio</Form.Label>
                <Form.Control type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              </Form.Group>
            </Col>
            <Col>
              <Form.Group className="mb-3">
                <Form.Label>Fim</Form.Label>
                <Form.Control type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
              </Form.Group>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>Cancelar</Button>
          <Button variant="primary" type="submit">{isEdit ? 'Salvar' : 'Criar'}</Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}

function ConfirmModal({ show, onHide, onConfirm, message }) {
  return (
    <Modal show={show} onHide={onHide} data-bs-theme="dark" size="sm">
      <Modal.Body>
        <p className="mb-0">{message}</p>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" size="sm" onClick={onHide}>Cancelar</Button>
        <Button variant="danger" size="sm" onClick={() => { onConfirm(); onHide() }}>Deletar</Button>
      </Modal.Footer>
    </Modal>
  )
}

function GoalsPage() {
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingId, setLoadingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editGoal, setEditGoal] = useState(null)
  const [expanded, setExpanded] = useState({})
  const [error, setError] = useState(null)
  const [availableMetrics, setAvailableMetrics] = useState([])
  const [deleteId, setDeleteId] = useState(null)
  const [defaultParentId, setDefaultParentId] = useState(null)

  // Build metric unit map from availableMetrics
  const metricUnits = {}
  for (const m of availableMetrics) {
    metricUnits[m.key] = m.unit
  }

  const loadData = useCallback(() => {
    return api.getGoals().then((result) => {
      const tree = Array.isArray(result) ? result : []
      setGoals(tree)
      setError(null)
      // Auto-expand root goals and active phases
      const autoExpand = {}
      const walkTree = (nodes) => {
        for (const g of nodes) {
          if (g.goalType === 'group') {
            // Auto-expand root groups and active phases
            if (!g.parentId || g.status === 'active') {
              autoExpand[g.id] = true
            }
            if (g.children) walkTree(g.children)
          }
        }
      }
      walkTree(tree)
      setExpanded((prev) => ({ ...autoExpand, ...prev }))
    }).catch((err) => {
      console.error(err)
      setError(err.message || 'Erro desconhecido')
    })
  }, [])

  useEffect(() => {
    Promise.all([
      loadData(),
      api.getAvailableMetrics().then(setAvailableMetrics).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [loadData])

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

  const handleSave = async (data, goalId) => {
    try {
      if (goalId) {
        await api.updateGoal(goalId, data)
      } else {
        await api.createGoal(data)
      }
      await loadData()
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await api.deleteGoal(deleteId)
      await loadData()
    } catch (err) {
      console.error(err)
    }
  }

  const handleEdit = (goal) => {
    setEditGoal(goal)
    setDefaultParentId(null)
    setShowForm(true)
  }

  const handleAddChild = (parentId) => {
    setEditGoal(null)
    setDefaultParentId(parentId)
    setShowForm(true)
  }

  const handleExpand = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  if (loading) {
    return <div className="text-center mt-5"><Spinner animation="border" /></div>
  }

  if (error && goals.length === 0) {
    return (
      <Card className="text-center p-5">
        <Card.Body>
          <p className="text-muted">Erro ao carregar metas.</p>
          <p className="text-danger small"><code>{error}</code></p>
        </Card.Body>
      </Card>
    )
  }

  // Pre-set parentId for "add child" action
  const formEditGoal = editGoal || (defaultParentId ? { parentId: defaultParentId } : null)

  return (
    <>
      <style>{`
        .lm-goal-actions { display: none; gap: 4px; }
        .lm-goal-hoverable:hover .lm-goal-actions,
        .lm-goal-hoverable .lm-goal-actions button:focus { display: inline-flex; }
      `}</style>

      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="lm-section-header mb-0">Metas</h4>
        <Button variant="outline-primary" size="sm" onClick={() => { setEditGoal(null); setDefaultParentId(null); setShowForm(true) }}>+ Meta</Button>
      </div>

      {goals.length === 0 ? (
        <Card className="text-center p-4 mb-4">
          <Card.Body>
            <p className="text-muted mb-0">
              Nenhuma meta cadastrada. Execute <code>flask seed-goals</code> para popular as metas do Projeto Travessia ou crie uma nova meta.
            </p>
          </Card.Body>
        </Card>
      ) : (
        goals.map((goal) => (
          <GoalNode
            key={goal.id}
            goal={goal}
            depth={0}
            onToggle={handleToggle}
            loadingId={loadingId}
            expanded={expanded}
            onExpand={handleExpand}
            onEdit={handleEdit}
            onDelete={(id) => setDeleteId(id)}
            onAddChild={handleAddChild}
            metricUnits={metricUnits}
          />
        ))
      )}

      <GoalForm
        show={showForm}
        onHide={() => { setShowForm(false); setEditGoal(null); setDefaultParentId(null) }}
        onSave={handleSave}
        availableMetrics={availableMetrics}
        goals={goals}
        editGoal={formEditGoal}
      />

      <ConfirmModal
        show={deleteId !== null}
        onHide={() => setDeleteId(null)}
        onConfirm={handleDelete}
        message="Deletar esta meta? Sub-metas tambem serao deletadas."
      />
    </>
  )
}

export default GoalsPage

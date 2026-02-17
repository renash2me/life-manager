import { useState, useEffect, useCallback } from 'react'
import {
  Card, Row, Col, Form, Button, Spinner, Table, Badge,
  Tab, Tabs, Modal, InputGroup,
} from 'react-bootstrap'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid,
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

// --- Exercise Search Modal ---

function ExerciseSearchModal({ show, onHide, onSelect }) {
  const [query, setQuery] = useState('')
  const [muscleGroup, setMuscleGroup] = useState('')
  const [groups, setGroups] = useState([])
  const [exercises, setExercises] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (show) {
      api.getMuscleGroups().then(setGroups).catch(console.error)
      search()
    }
  }, [show])

  const search = useCallback(() => {
    setLoading(true)
    api.getExercises(query, muscleGroup)
      .then(setExercises)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [query, muscleGroup])

  useEffect(() => {
    if (show) search()
  }, [muscleGroup])

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Buscar Exercicio</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Row className="g-2 mb-3">
          <Col md={6}>
            <InputGroup>
              <Form.Control placeholder="Buscar exercicio..." value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && search()} />
              <Button variant="outline-secondary" onClick={search}>Buscar</Button>
            </InputGroup>
          </Col>
          <Col md={6}>
            <Form.Select value={muscleGroup} onChange={(e) => setMuscleGroup(e.target.value)}>
              <option value="">Todos os grupos</option>
              {groups.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
            </Form.Select>
          </Col>
        </Row>

        {loading ? (
          <div className="text-center p-3"><Spinner animation="border" size="sm" /></div>
        ) : (
          <Table hover size="sm" className="lm-table">
            <thead>
              <tr>
                <th>Exercicio</th>
                <th>Grupo</th>
                <th>Equipamento</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {exercises.map((e) => (
                <tr key={e.id}>
                  <td>{e.name}</td>
                  <td><Badge bg="secondary">{e.muscleGroupLabel}</Badge></td>
                  <td className="text-muted small">{e.equipment}</td>
                  <td>
                    <Button size="sm" variant="outline-primary" onClick={() => onSelect(e)}>+</Button>
                  </td>
                </tr>
              ))}
              {!exercises.length && <tr><td colSpan={4} className="text-center text-muted">Nenhum resultado</td></tr>}
            </tbody>
          </Table>
        )}
      </Modal.Body>
    </Modal>
  )
}

// --- Plans Tab (Fichas) ---

function PlansTab() {
  const [plans, setPlans] = useState([])
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showExerciseSearch, setShowExerciseSearch] = useState(false)
  const [newPlanName, setNewPlanName] = useState('')
  const [creating, setCreating] = useState(false)
  const [addSets, setAddSets] = useState(3)
  const [addReps, setAddReps] = useState('12')
  const [addRest, setAddRest] = useState(60)

  useEffect(() => {
    api.getWorkoutPlans().then(setPlans).catch(console.error).finally(() => setLoading(false))
  }, [])

  const selectPlan = (planId) => {
    api.getWorkoutPlan(planId).then(setSelectedPlan).catch(console.error)
  }

  const handleCreatePlan = () => {
    if (!newPlanName.trim()) return
    setCreating(true)
    api.createWorkoutPlan({ name: newPlanName })
      .then((p) => { setPlans([...plans, p]); setSelectedPlan(p); setNewPlanName('') })
      .catch(console.error).finally(() => setCreating(false))
  }

  const handleDeletePlan = (id) => {
    if (!confirm('Excluir esta ficha?')) return
    api.deleteWorkoutPlan(id).then(() => {
      setPlans(plans.filter((p) => p.id !== id))
      if (selectedPlan?.id === id) setSelectedPlan(null)
    }).catch(console.error)
  }

  const handleAddExercise = (exercise) => {
    if (!selectedPlan) return
    api.addPlanExercise(selectedPlan.id, {
      exerciseId: exercise.id,
      sets: addSets,
      reps: addReps,
      restSeconds: addRest,
    }).then(() => {
      selectPlan(selectedPlan.id)
      setShowExerciseSearch(false)
    }).catch(console.error)
  }

  const handleDeleteExercise = (peId) => {
    api.deletePlanExercise(selectedPlan.id, peId).then(() => {
      selectPlan(selectedPlan.id)
    }).catch(console.error)
  }

  if (loading) return <div className="text-center p-4"><Spinner animation="border" size="sm" /></div>

  return (
    <>
      <Row className="g-2 mb-3">
        <Col md={4}>
          <InputGroup>
            <Form.Control placeholder="Nome da nova ficha" value={newPlanName}
              onChange={(e) => setNewPlanName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreatePlan()} />
            <Button variant="outline-primary" onClick={handleCreatePlan} disabled={creating}>Criar</Button>
          </InputGroup>
        </Col>
      </Row>

      <Row className="g-3">
        <Col md={3}>
          <Card>
            <Card.Body className="p-2">
              <Card.Title className="small fw-bold mb-2">Fichas de Treino</Card.Title>
              {plans.map((p) => (
                <div key={p.id}
                  className={`d-flex justify-content-between align-items-center p-2 rounded mb-1 ${selectedPlan?.id === p.id ? 'bg-primary bg-opacity-10' : ''}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => selectPlan(p.id)}>
                  <div className="small fw-bold">{p.name}</div>
                  <Button size="sm" variant="outline-danger"
                    onClick={(e) => { e.stopPropagation(); handleDeletePlan(p.id) }}>&#x2715;</Button>
                </div>
              ))}
              {!plans.length && <p className="text-muted small mb-0">Nenhuma ficha ainda</p>}
            </Card.Body>
          </Card>
        </Col>
        <Col md={9}>
          {selectedPlan ? (
            <Card>
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <Card.Title className="mb-0">{selectedPlan.name}</Card.Title>
                  <div className="d-flex gap-2 align-items-center">
                    <Form.Control size="sm" type="number" style={{ width: 60 }} value={addSets}
                      onChange={(e) => setAddSets(Number(e.target.value))} placeholder="Sets" />
                    <span className="small text-muted">x</span>
                    <Form.Control size="sm" style={{ width: 70 }} value={addReps}
                      onChange={(e) => setAddReps(e.target.value)} placeholder="Reps" />
                    <Form.Control size="sm" type="number" style={{ width: 70 }} value={addRest}
                      onChange={(e) => setAddRest(Number(e.target.value))} placeholder="Rest(s)" />
                    <Button size="sm" onClick={() => setShowExerciseSearch(true)}>+ Exercicio</Button>
                  </div>
                </div>

                <Table size="sm" className="lm-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Exercicio</th>
                      <th>Grupo</th>
                      <th className="text-center">Series x Reps</th>
                      <th className="text-center">Descanso</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedPlan.exercises || []).map((pe, i) => (
                      <tr key={pe.id}>
                        <td>{i + 1}</td>
                        <td>{pe.exercise?.name}</td>
                        <td><Badge bg="secondary">{pe.exercise?.muscleGroupLabel}</Badge></td>
                        <td className="text-center">{pe.sets} x {pe.reps}</td>
                        <td className="text-center">{pe.restSeconds}s</td>
                        <td>
                          <Button size="sm" variant="outline-danger"
                            onClick={() => handleDeleteExercise(pe.id)}>&#x2715;</Button>
                        </td>
                      </tr>
                    ))}
                    {!(selectedPlan.exercises || []).length && (
                      <tr><td colSpan={6} className="text-center text-muted">Ficha vazia. Adicione exercicios.</td></tr>
                    )}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          ) : (
            <Card className="text-center p-4">
              <Card.Body>
                <p className="text-muted mb-0">Selecione ou crie uma ficha de treino</p>
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>

      <ExerciseSearchModal show={showExerciseSearch} onHide={() => setShowExerciseSearch(false)}
        onSelect={handleAddExercise} />
    </>
  )
}

// --- Train Tab ---

function TrainTab() {
  const [plans, setPlans] = useState([])
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedPlanId, setSelectedPlanId] = useState('')

  useEffect(() => {
    api.getWorkoutPlans().then(setPlans).catch(console.error).finally(() => setLoading(false))
  }, [])

  const startSession = () => {
    api.createWorkoutSession({
      workoutPlanId: selectedPlanId ? Number(selectedPlanId) : null,
      date: new Date().toISOString().slice(0, 10),
    }).then((s) => {
      // Load the full plan to pre-populate exercises
      if (s.workoutPlanId) {
        api.getWorkoutPlan(s.workoutPlanId).then((plan) => {
          setSession({ ...s, plan })
        })
      } else {
        setSession(s)
      }
    }).catch(console.error)
  }

  const addSet = (exerciseId, setNumber) => {
    api.addWorkoutSet(session.id, {
      exerciseId,
      setNumber,
      reps: 0,
      weightKg: 0,
    }).then(() => {
      api.getWorkoutSession(session.id).then(setSession)
    }).catch(console.error)
  }

  const updateSet = (setId, field, value) => {
    api.updateWorkoutSet(session.id, setId, { [field]: value })
      .then(() => api.getWorkoutSession(session.id).then(setSession))
      .catch(console.error)
  }

  const finishSession = (durationMinutes) => {
    api.updateWorkoutSession(session.id, {
      completed: true,
      durationMinutes,
    }).then((s) => {
      setSession(s)
      alert('Treino finalizado! XP concedido.')
    }).catch(console.error)
  }

  if (loading) return <div className="text-center p-4"><Spinner animation="border" size="sm" /></div>

  if (!session) {
    return (
      <Card className="text-center p-4">
        <Card.Body>
          <h5 className="mb-3">Iniciar Treino</h5>
          <div className="d-flex justify-content-center gap-2 align-items-center mb-3">
            <Form.Select style={{ width: 250 }} value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}>
              <option value="">Treino livre</option>
              {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Form.Select>
            <Button onClick={startSession}>Iniciar</Button>
          </div>
        </Card.Body>
      </Card>
    )
  }

  // Group sets by exercise
  const setsByExercise = {}
  for (const s of (session.sets || [])) {
    if (!setsByExercise[s.exerciseId]) setsByExercise[s.exerciseId] = { name: s.exerciseName, sets: [] }
    setsByExercise[s.exerciseId].sets.push(s)
  }

  // Plan exercises to show
  const planExercises = session.plan?.exercises || []

  return (
    <Card>
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h5 className="mb-0">{session.planName || 'Treino Livre'}</h5>
            <small className="text-muted">{session.date}</small>
          </div>
          {!session.completed ? (
            <Button variant="success" onClick={() => {
              const mins = prompt('Duracao do treino em minutos:')
              if (mins) finishSession(Number(mins))
            }}>
              Finalizar Treino
            </Button>
          ) : (
            <Badge bg="success" className="fs-6">Concluido - {session.durationMinutes}min</Badge>
          )}
        </div>

        {/* Plan exercises - allow adding sets */}
        {planExercises.map((pe) => {
          const exSets = setsByExercise[pe.exerciseId]?.sets || []
          return (
            <Card key={pe.id} className="mb-2">
              <Card.Body className="py-2">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <div>
                    <strong>{pe.exercise?.name}</strong>
                    <small className="text-muted ms-2">{pe.sets} x {pe.reps}</small>
                  </div>
                  {!session.completed && (
                    <Button size="sm" variant="outline-primary"
                      onClick={() => addSet(pe.exerciseId, exSets.length + 1)}>
                      + Serie
                    </Button>
                  )}
                </div>
                {exSets.length > 0 && (
                  <Table size="sm" className="lm-table mb-0">
                    <thead>
                      <tr>
                        <th>Serie</th>
                        <th>Reps</th>
                        <th>Carga (kg)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {exSets.map((s) => (
                        <tr key={s.id}>
                          <td>{s.setNumber}</td>
                          <td>
                            {session.completed ? s.reps : (
                              <Form.Control size="sm" type="number" style={{ width: 70 }}
                                defaultValue={s.reps}
                                onBlur={(e) => updateSet(s.id, 'reps', Number(e.target.value))} />
                            )}
                          </td>
                          <td>
                            {session.completed ? s.weightKg : (
                              <Form.Control size="sm" type="number" step="0.5" style={{ width: 80 }}
                                defaultValue={s.weightKg}
                                onBlur={(e) => updateSet(s.id, 'weightKg', Number(e.target.value))} />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </Card.Body>
            </Card>
          )
        })}

        {/* Non-plan sets */}
        {Object.entries(setsByExercise)
          .filter(([exId]) => !planExercises.some((pe) => pe.exerciseId === Number(exId)))
          .map(([exId, { name, sets }]) => (
            <Card key={exId} className="mb-2">
              <Card.Body className="py-2">
                <strong>{name}</strong>
                <Table size="sm" className="lm-table mb-0 mt-1">
                  <tbody>
                    {sets.map((s) => (
                      <tr key={s.id}>
                        <td>Serie {s.setNumber}</td>
                        <td>{s.reps} reps</td>
                        <td>{s.weightKg} kg</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          ))
        }
      </Card.Body>
    </Card>
  )
}

// --- History Tab ---

function HistoryTab() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getWorkoutSessions(90)
      .then(setSessions)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-center p-4"><Spinner animation="border" size="sm" /></div>

  return (
    <>
      {sessions.length > 0 ? (
        <Table hover className="lm-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Treino</th>
              <th>Duracao</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id}>
                <td>{new Date(s.date).toLocaleDateString('pt-BR')}</td>
                <td>{s.planName || 'Treino livre'}</td>
                <td>{s.durationMinutes ? `${s.durationMinutes} min` : '--'}</td>
                <td>
                  <Badge bg={s.completed ? 'success' : 'warning'}>
                    {s.completed ? 'Concluido' : 'Em andamento'}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <Card className="text-center p-4">
          <Card.Body>
            <p className="text-muted mb-0">Nenhuma sessao de treino registrada.</p>
          </Card.Body>
        </Card>
      )}
    </>
  )
}

// --- Progress Tab ---

function ProgressTab() {
  const [exercises, setExercises] = useState([])
  const [selectedExercise, setSelectedExercise] = useState(null)
  const [progressData, setProgressData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getExercises('', '')
      .then(setExercises)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const loadProgress = (exerciseId) => {
    setSelectedExercise(exerciseId)
    api.getExerciseProgress(exerciseId, 180)
      .then(setProgressData)
      .catch(console.error)
  }

  if (loading) return <div className="text-center p-4"><Spinner animation="border" size="sm" /></div>

  const chartData = (progressData?.data || []).map((d) => ({
    date: fmtDateShort(d.date),
    weight: d.maxWeight,
    volume: d.totalVolume,
  }))

  return (
    <>
      <Row className="g-3">
        <Col md={4}>
          <Card>
            <Card.Body className="p-2">
              <Card.Title className="small fw-bold mb-2">Exercicios</Card.Title>
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                {exercises.map((e) => (
                  <div key={e.id}
                    className={`p-2 rounded mb-1 small ${selectedExercise === e.id ? 'bg-primary bg-opacity-10 fw-bold' : ''}`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => loadProgress(e.id)}>
                    {e.name}
                    <Badge bg="secondary" className="ms-1">{e.muscleGroupLabel}</Badge>
                  </div>
                ))}
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={8}>
          {progressData?.data?.length > 0 ? (
            <Card className="lm-chart-card">
              <Card.Body>
                <Card.Title>{progressData.exercise?.name} - Progresso</Card.Title>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={TICK_STYLE} />
                    <YAxis yAxisId="left" tick={TICK_STYLE} label={{ value: 'kg', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis yAxisId="right" orientation="right" tick={TICK_STYLE} label={{ value: 'Volume', angle: 90, position: 'insideRight', fill: '#94a3b8', fontSize: 11 }} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Line yAxisId="left" type="monotone" dataKey="weight" stroke="#16a34a" name="Carga Max (kg)" dot strokeWidth={2} />
                    <Line yAxisId="right" type="monotone" dataKey="volume" stroke="#7c3aed" name="Volume Total" dot={false} strokeDasharray="4 4" />
                  </LineChart>
                </ResponsiveContainer>
              </Card.Body>
            </Card>
          ) : selectedExercise ? (
            <Card className="text-center p-4">
              <Card.Body>
                <p className="text-muted mb-0">Sem dados de progresso para este exercicio.</p>
              </Card.Body>
            </Card>
          ) : (
            <Card className="text-center p-4">
              <Card.Body>
                <p className="text-muted mb-0">Selecione um exercicio para ver o progresso</p>
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>
    </>
  )
}

// --- Main Page ---

function WorkoutTrackingPage() {
  return (
    <>
      <h4 className="lm-section-header mb-4">Treinos</h4>
      <Tabs defaultActiveKey="plans" className="mb-4">
        <Tab eventKey="plans" title="Fichas">
          <PlansTab />
        </Tab>
        <Tab eventKey="train" title="Treinar">
          <TrainTab />
        </Tab>
        <Tab eventKey="history" title="Historico">
          <HistoryTab />
        </Tab>
        <Tab eventKey="progress" title="Progresso">
          <ProgressTab />
        </Tab>
      </Tabs>
    </>
  )
}

export default WorkoutTrackingPage

import { useState, useEffect, useCallback } from 'react'
import {
  Card, Row, Col, Form, Button, Spinner, Table, Badge,
  Tab, Tabs, ProgressBar, Modal, InputGroup,
} from 'react-bootstrap'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine,
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

// --- Profile Tab ---

function ProfileTab() {
  const [profile, setProfile] = useState(null)
  const [options, setOptions] = useState(null)
  const [form, setForm] = useState({
    age: '', sex: 'male', weightKg: '', heightCm: '',
    activityLevel: 'moderate', goal: 'maintain',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      api.getNutritionProfile(),
      api.getNutritionOptions(),
    ]).then(([p, opts]) => {
      setOptions(opts)
      if (p) {
        setProfile(p)
        setForm({
          age: p.age || '', sex: p.sex || 'male',
          weightKg: p.weightKg || '', heightCm: p.heightCm || '',
          activityLevel: p.activityLevel || 'moderate', goal: p.goal || 'maintain',
        })
      }
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  const handleSave = () => {
    setSaving(true)
    api.updateNutritionProfile({
      age: Number(form.age),
      sex: form.sex,
      weightKg: Number(form.weightKg),
      heightCm: Number(form.heightCm),
      activityLevel: form.activityLevel,
      goal: form.goal,
    }).then((p) => {
      setProfile(p)
    }).catch(console.error).finally(() => setSaving(false))
  }

  if (loading) return <div className="text-center p-4"><Spinner animation="border" size="sm" /></div>

  return (
    <Row className="g-4">
      <Col md={6}>
        <Card>
          <Card.Body>
            <Card.Title>Dados Pessoais</Card.Title>
            <Row className="g-3">
              <Col xs={6}>
                <Form.Label>Idade</Form.Label>
                <Form.Control type="number" value={form.age}
                  onChange={(e) => setForm({ ...form, age: e.target.value })} />
              </Col>
              <Col xs={6}>
                <Form.Label>Sexo</Form.Label>
                <Form.Select value={form.sex}
                  onChange={(e) => setForm({ ...form, sex: e.target.value })}>
                  <option value="male">Masculino</option>
                  <option value="female">Feminino</option>
                </Form.Select>
              </Col>
              <Col xs={6}>
                <Form.Label>Peso (kg)</Form.Label>
                <Form.Control type="number" step="0.1" value={form.weightKg}
                  onChange={(e) => setForm({ ...form, weightKg: e.target.value })} />
              </Col>
              <Col xs={6}>
                <Form.Label>Altura (cm)</Form.Label>
                <Form.Control type="number" value={form.heightCm}
                  onChange={(e) => setForm({ ...form, heightCm: e.target.value })} />
              </Col>
              <Col xs={12}>
                <Form.Label>Nivel de Atividade</Form.Label>
                <Form.Select value={form.activityLevel}
                  onChange={(e) => setForm({ ...form, activityLevel: e.target.value })}>
                  {(options?.activityLevels || []).map((a) => (
                    <option key={a.value} value={a.value}>{a.label}</option>
                  ))}
                </Form.Select>
              </Col>
              <Col xs={12}>
                <Form.Label>Objetivo</Form.Label>
                <Form.Select value={form.goal}
                  onChange={(e) => setForm({ ...form, goal: e.target.value })}>
                  {(options?.goals || []).map((g) => (
                    <option key={g.value} value={g.value}>{g.label}</option>
                  ))}
                </Form.Select>
              </Col>
              <Col xs={12}>
                <Button onClick={handleSave} disabled={saving || !form.age || !form.weightKg || !form.heightCm}>
                  {saving ? <Spinner animation="border" size="sm" /> : 'Calcular e Salvar'}
                </Button>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      </Col>
      <Col md={6}>
        {profile && profile.tmb && (
          <Card>
            <Card.Body>
              <Card.Title>Resultado</Card.Title>
              <Table size="sm" className="lm-table mb-0">
                <tbody>
                  <tr><td className="text-muted">TMB (Taxa Metabolica Basal)</td><td className="text-end fw-bold">{profile.tmb} kcal</td></tr>
                  <tr><td className="text-muted">TDEE (Gasto Total Diario)</td><td className="text-end fw-bold">{profile.tdee} kcal</td></tr>
                  <tr><td className="text-muted">Meta Calorica</td><td className="text-end fw-bold text-primary">{profile.targetCalories} kcal</td></tr>
                  <tr><td colSpan={2}><hr className="my-1" /></td></tr>
                  <tr><td className="text-muted">Proteinas</td><td className="text-end">{profile.targetProteinG}g</td></tr>
                  <tr><td className="text-muted">Carboidratos</td><td className="text-end">{profile.targetCarbsG}g</td></tr>
                  <tr><td className="text-muted">Gorduras</td><td className="text-end">{profile.targetFatG}g</td></tr>
                  <tr><td className="text-muted">Fibras</td><td className="text-end">{profile.targetFiberG}g</td></tr>
                </tbody>
              </Table>
              <div className="mt-3">
                <MacroBar label="Proteinas" value={profile.targetProteinG} max={profile.targetProteinG} color="#ef4444" unit="g" />
                <MacroBar label="Carboidratos" value={profile.targetCarbsG} max={profile.targetCarbsG} color="#f59e42" unit="g" />
                <MacroBar label="Gorduras" value={profile.targetFatG} max={profile.targetFatG} color="#7c3aed" unit="g" />
              </div>
            </Card.Body>
          </Card>
        )}
      </Col>
    </Row>
  )
}

// --- MacroBar component ---

function MacroBar({ label, value, max, color, unit }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className="mb-2">
      <div className="d-flex justify-content-between small">
        <span>{label}</span>
        <span>{value}{unit} / {max}{unit}</span>
      </div>
      <ProgressBar now={pct} style={{ height: 8, backgroundColor: 'rgba(255,255,255,0.06)' }}
        variant={undefined} >
        <ProgressBar now={pct} style={{ backgroundColor: color }} />
      </ProgressBar>
    </div>
  )
}

// --- Food Search Modal ---

function FoodSearchModal({ show, onHide, onSelect }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [categories, setCategories] = useState([])
  const [foods, setFoods] = useState([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    if (show) {
      api.getFoodCategories().then(setCategories).catch(console.error)
    }
  }, [show])

  const search = useCallback((p = 1) => {
    setLoading(true)
    api.searchFoods(query, category, p)
      .then((data) => {
        setFoods(data.foods)
        setPage(data.page)
        setTotalPages(data.pages)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [query, category])

  useEffect(() => {
    if (show) search(1)
  }, [show, category])

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Buscar Alimento</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Row className="g-2 mb-3">
          <Col md={6}>
            <InputGroup>
              <Form.Control
                placeholder="Buscar alimento..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && search(1)}
              />
              <Button variant="outline-secondary" onClick={() => search(1)}>Buscar</Button>
            </InputGroup>
          </Col>
          <Col md={6}>
            <Form.Select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Todas as categorias</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </Form.Select>
          </Col>
        </Row>

        {loading ? (
          <div className="text-center p-3"><Spinner animation="border" size="sm" /></div>
        ) : (
          <>
            <Table hover size="sm" className="lm-table">
              <thead>
                <tr>
                  <th>Alimento</th>
                  <th className="text-end">Cal</th>
                  <th className="text-end">P</th>
                  <th className="text-end">C</th>
                  <th className="text-end">G</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {foods.map((f) => (
                  <tr key={f.id}>
                    <td>
                      {f.name}
                      {f.category && <small className="text-muted d-block">{f.category}</small>}
                    </td>
                    <td className="text-end">{f.caloriesPer100g}</td>
                    <td className="text-end">{f.proteinPer100g}g</td>
                    <td className="text-end">{f.carbsPer100g}g</td>
                    <td className="text-end">{f.fatPer100g}g</td>
                    <td>
                      <Button size="sm" variant="outline-primary" onClick={() => onSelect(f)}>+</Button>
                    </td>
                  </tr>
                ))}
                {!foods.length && <tr><td colSpan={6} className="text-center text-muted">Nenhum resultado</td></tr>}
              </tbody>
            </Table>
            {totalPages > 1 && (
              <div className="d-flex justify-content-center gap-2">
                <Button size="sm" variant="outline-secondary" disabled={page <= 1} onClick={() => search(page - 1)}>Anterior</Button>
                <span className="align-self-center small text-muted">{page} / {totalPages}</span>
                <Button size="sm" variant="outline-secondary" disabled={page >= totalPages} onClick={() => search(page + 1)}>Proximo</Button>
              </div>
            )}
          </>
        )}
      </Modal.Body>
    </Modal>
  )
}

// --- Meal Plan Tab ---

function MealPlanTab() {
  const [plans, setPlans] = useState([])
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showFoodSearch, setShowFoodSearch] = useState(false)
  const [addingMealType, setAddingMealType] = useState('almoco')
  const [addingQty, setAddingQty] = useState(100)
  const [creating, setCreating] = useState(false)
  const [newPlanName, setNewPlanName] = useState('')

  const loadPlans = () => {
    api.getMealPlans().then(setPlans).catch(console.error).finally(() => setLoading(false))
  }

  useEffect(() => { loadPlans() }, [])

  const selectPlan = (planId) => {
    api.getMealPlan(planId).then(setSelectedPlan).catch(console.error)
  }

  const handleCreatePlan = () => {
    if (!newPlanName.trim()) return
    setCreating(true)
    api.createMealPlan({ name: newPlanName })
      .then((p) => {
        setPlans([p, ...plans])
        setSelectedPlan(p)
        setNewPlanName('')
      })
      .catch(console.error)
      .finally(() => setCreating(false))
  }

  const handleSuggest = () => {
    setCreating(true)
    api.suggestMealPlan()
      .then((p) => {
        setPlans([p, ...plans])
        setSelectedPlan(p)
      })
      .catch((e) => alert(e.message))
      .finally(() => setCreating(false))
  }

  const handleDeletePlan = (id) => {
    if (!confirm('Excluir este plano?')) return
    api.deleteMealPlan(id).then(() => {
      setPlans(plans.filter((p) => p.id !== id))
      if (selectedPlan?.id === id) setSelectedPlan(null)
    }).catch(console.error)
  }

  const handleAddFood = (food) => {
    if (!selectedPlan) return
    api.addPlanItem(selectedPlan.id, {
      foodId: food.id,
      mealType: addingMealType,
      quantityGrams: addingQty,
    }).then(() => {
      selectPlan(selectedPlan.id)
      setShowFoodSearch(false)
    }).catch(console.error)
  }

  const handleDeleteItem = (itemId) => {
    api.deletePlanItem(selectedPlan.id, itemId).then(() => {
      selectPlan(selectedPlan.id)
    }).catch(console.error)
  }

  // Group items by meal type
  const groupedItems = {}
  if (selectedPlan?.items) {
    for (const item of selectedPlan.items) {
      if (!groupedItems[item.mealType]) groupedItems[item.mealType] = []
      groupedItems[item.mealType].push(item)
    }
  }

  const planTotals = (selectedPlan?.items || []).reduce((acc, item) => ({
    calories: acc.calories + (item.calories || 0),
    protein: acc.protein + (item.protein || 0),
    carbs: acc.carbs + (item.carbs || 0),
    fat: acc.fat + (item.fat || 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 })

  if (loading) return <div className="text-center p-4"><Spinner animation="border" size="sm" /></div>

  return (
    <>
      <Row className="g-3 mb-3">
        <Col md={4}>
          <InputGroup>
            <Form.Control placeholder="Nome do novo plano" value={newPlanName}
              onChange={(e) => setNewPlanName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreatePlan()} />
            <Button variant="outline-primary" onClick={handleCreatePlan} disabled={creating}>Criar</Button>
          </InputGroup>
        </Col>
        <Col md={3}>
          <Button variant="outline-success" onClick={handleSuggest} disabled={creating}>
            {creating ? <Spinner animation="border" size="sm" /> : 'Sugerir Plano'}
          </Button>
        </Col>
      </Row>

      <Row className="g-3">
        <Col md={3}>
          <Card>
            <Card.Body className="p-2">
              <Card.Title className="small fw-bold mb-2">Planos</Card.Title>
              {plans.map((p) => (
                <div
                  key={p.id}
                  className={`d-flex justify-content-between align-items-center p-2 rounded mb-1 ${selectedPlan?.id === p.id ? 'bg-primary bg-opacity-10' : ''}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => selectPlan(p.id)}
                >
                  <div>
                    <div className="small fw-bold">{p.name}</div>
                    {p.totalCalories != null && <small className="text-muted">{p.totalCalories} kcal</small>}
                  </div>
                  <Button size="sm" variant="outline-danger" onClick={(e) => { e.stopPropagation(); handleDeletePlan(p.id) }}>
                    &#x2715;
                  </Button>
                </div>
              ))}
              {!plans.length && <p className="text-muted small mb-0">Nenhum plano ainda</p>}
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
                    <Form.Select size="sm" style={{ width: 160 }} value={addingMealType}
                      onChange={(e) => setAddingMealType(e.target.value)}>
                      {Object.entries({
                        cafe_da_manha: 'Cafe da Manha', lanche_da_manha: 'Lanche da Manha',
                        almoco: 'Almoco', lanche_da_tarde: 'Lanche da Tarde',
                        jantar: 'Jantar', ceia: 'Ceia', pre_treino: 'Pre-Treino', pos_treino: 'Pos-Treino',
                      }).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </Form.Select>
                    <Form.Control size="sm" type="number" style={{ width: 80 }} value={addingQty}
                      onChange={(e) => setAddingQty(Number(e.target.value))} placeholder="g" />
                    <Button size="sm" onClick={() => setShowFoodSearch(true)}>+ Alimento</Button>
                  </div>
                </div>

                {/* Totals */}
                <div className="d-flex gap-3 mb-3">
                  <Badge bg="secondary">{Math.round(planTotals.calories)} kcal</Badge>
                  <Badge bg="danger">P: {Math.round(planTotals.protein)}g</Badge>
                  <Badge bg="warning" text="dark">C: {Math.round(planTotals.carbs)}g</Badge>
                  <Badge bg="info">G: {Math.round(planTotals.fat)}g</Badge>
                </div>

                {/* Items grouped by meal */}
                {Object.entries(groupedItems).map(([mealType, items]) => (
                  <div key={mealType} className="mb-3">
                    <h6 className="text-muted">{items[0]?.mealTypeLabel || mealType}</h6>
                    <Table size="sm" className="lm-table mb-0">
                      <tbody>
                        {items.map((item) => (
                          <tr key={item.id}>
                            <td>{item.food?.name}</td>
                            <td className="text-end">{item.quantityGrams}g</td>
                            <td className="text-end">{item.calories} kcal</td>
                            <td className="text-end">{item.protein}g P</td>
                            <td className="text-end">{item.carbs}g C</td>
                            <td className="text-end">{item.fat}g G</td>
                            <td>
                              <Button size="sm" variant="outline-danger"
                                onClick={() => handleDeleteItem(item.id)}>&#x2715;</Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                ))}

                {!Object.keys(groupedItems).length && (
                  <p className="text-muted text-center">Plano vazio. Adicione alimentos acima.</p>
                )}
              </Card.Body>
            </Card>
          ) : (
            <Card className="text-center p-4">
              <Card.Body>
                <p className="text-muted mb-0">Selecione ou crie um plano alimentar</p>
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>

      <FoodSearchModal show={showFoodSearch} onHide={() => setShowFoodSearch(false)} onSelect={handleAddFood} />
    </>
  )
}

// --- Daily Log Tab ---

function DailyLogTab() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10))
  const [entries, setEntries] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showFoodSearch, setShowFoodSearch] = useState(false)
  const [addingMealType, setAddingMealType] = useState('almoco')
  const [addingQty, setAddingQty] = useState(100)
  const [plans, setPlans] = useState([])

  const loadDay = (d) => {
    setLoading(true)
    Promise.all([
      api.getFoodLog(d),
      api.getNutritionSummary(d),
      api.getMealPlans(),
    ]).then(([log, sum, p]) => {
      setEntries(log)
      setSummary(sum)
      setPlans(p)
    }).catch(console.error).finally(() => setLoading(false))
  }

  useEffect(() => { loadDay(selectedDate) }, [selectedDate])

  const handleAddFood = (food) => {
    api.addFoodLog({
      date: selectedDate,
      foodId: food.id,
      mealType: addingMealType,
      quantityGrams: addingQty,
    }).then(() => {
      loadDay(selectedDate)
      setShowFoodSearch(false)
    }).catch(console.error)
  }

  const handleDelete = (id) => {
    api.deleteFoodLog(id).then(() => loadDay(selectedDate)).catch(console.error)
  }

  const handleCopyPlan = (planId) => {
    api.copyPlanToLog({ planId, date: selectedDate })
      .then(() => loadDay(selectedDate))
      .catch(console.error)
  }

  // Group entries by meal type
  const grouped = {}
  for (const e of entries) {
    if (!grouped[e.mealType]) grouped[e.mealType] = []
    grouped[e.mealType].push(e)
  }

  const targets = summary?.targets
  const consumed = summary?.consumed || {}

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div className="d-flex align-items-center gap-2">
          <Button variant="outline-secondary" size="sm"
            onClick={() => { const d = new Date(selectedDate + 'T12:00:00'); d.setDate(d.getDate() - 1); setSelectedDate(d.toISOString().slice(0, 10)) }}>
            &#x25C0;
          </Button>
          <Form.Control type="date" size="sm" value={selectedDate} style={{ width: 160 }}
            onChange={(e) => setSelectedDate(e.target.value)} />
          <Button variant="outline-secondary" size="sm"
            onClick={() => { const d = new Date(selectedDate + 'T12:00:00'); d.setDate(d.getDate() + 1); setSelectedDate(d.toISOString().slice(0, 10)) }}>
            &#x25B6;
          </Button>
        </div>
        <div className="d-flex gap-2 align-items-center">
          {plans.length > 0 && (
            <Form.Select size="sm" style={{ width: 200 }}
              onChange={(e) => e.target.value && handleCopyPlan(Number(e.target.value))}>
              <option value="">Copiar do plano...</option>
              {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Form.Select>
          )}
          <Form.Select size="sm" style={{ width: 150 }} value={addingMealType}
            onChange={(e) => setAddingMealType(e.target.value)}>
            {Object.entries({
              cafe_da_manha: 'Cafe', lanche_da_manha: 'Lanche AM',
              almoco: 'Almoco', lanche_da_tarde: 'Lanche PM',
              jantar: 'Jantar', ceia: 'Ceia', pre_treino: 'Pre-Treino', pos_treino: 'Pos-Treino',
            }).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Form.Select>
          <Form.Control size="sm" type="number" style={{ width: 70 }} value={addingQty}
            onChange={(e) => setAddingQty(Number(e.target.value))} />
          <Button size="sm" onClick={() => setShowFoodSearch(true)}>+ Alimento</Button>
        </div>
      </div>

      {/* Macro progress */}
      {targets && (
        <Card className="mb-3">
          <Card.Body className="py-2">
            <Row className="g-2">
              <Col md={3}>
                <MacroBar label="Calorias" value={consumed.calories || 0} max={targets.calories} color="#16a34a" unit=" kcal" />
              </Col>
              <Col md={3}>
                <MacroBar label="Proteinas" value={consumed.protein || 0} max={targets.protein} color="#ef4444" unit="g" />
              </Col>
              <Col md={3}>
                <MacroBar label="Carboidratos" value={consumed.carbs || 0} max={targets.carbs} color="#f59e42" unit="g" />
              </Col>
              <Col md={3}>
                <MacroBar label="Gorduras" value={consumed.fat || 0} max={targets.fat} color="#7c3aed" unit="g" />
              </Col>
            </Row>
          </Card.Body>
        </Card>
      )}

      {loading ? (
        <div className="text-center p-4"><Spinner animation="border" size="sm" /></div>
      ) : (
        <>
          {Object.entries(grouped).map(([mealType, items]) => (
            <Card key={mealType} className="mb-2">
              <Card.Body className="py-2">
                <h6 className="text-muted mb-2">{items[0]?.mealTypeLabel || mealType}</h6>
                <Table size="sm" className="lm-table mb-0">
                  <tbody>
                    {items.map((e) => (
                      <tr key={e.id}>
                        <td>{e.food?.name}</td>
                        <td className="text-end">{e.quantityGrams}g</td>
                        <td className="text-end">{e.calories} kcal</td>
                        <td className="text-end">{e.protein}g P</td>
                        <td>
                          <Button size="sm" variant="outline-danger" onClick={() => handleDelete(e.id)}>&#x2715;</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          ))}
          {!entries.length && (
            <Card className="text-center p-4">
              <Card.Body>
                <p className="text-muted mb-0">Nenhum alimento registrado neste dia.</p>
              </Card.Body>
            </Card>
          )}
        </>
      )}

      <FoodSearchModal show={showFoodSearch} onHide={() => setShowFoodSearch(false)} onSelect={handleAddFood} />
    </>
  )
}

// --- History Tab ---

function HistoryTab() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)

  useEffect(() => {
    setLoading(true)
    api.getNutritionHistory(days)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [days])

  if (loading) return <div className="text-center p-4"><Spinner animation="border" size="sm" /></div>
  if (!data?.history?.length) {
    return (
      <Card className="text-center p-4">
        <Card.Body>
          <p className="text-muted mb-0">Sem historico de alimentacao ainda.</p>
        </Card.Body>
      </Card>
    )
  }

  const chartData = data.history.map((d) => ({
    date: fmtDateShort(d.date),
    calories: d.calories,
  }))

  return (
    <>
      <div className="d-flex justify-content-end mb-3 gap-2">
        {[7, 30, 90].map((d) => (
          <Button key={d} size="sm" variant={days === d ? 'primary' : 'outline-secondary'} onClick={() => setDays(d)}>
            {d}d
          </Button>
        ))}
      </div>
      <Card className="lm-chart-card mb-4">
        <Card.Body>
          <Card.Title>Calorias Diarias</Card.Title>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={TICK_STYLE} />
              <YAxis tick={TICK_STYLE} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="calories" fill="#16a34a" name="Calorias" radius={[4, 4, 0, 0]} />
              {data.targetCalories && (
                <ReferenceLine y={data.targetCalories} stroke="#ef4444" strokeDasharray="5 5" label={{ value: 'Meta', fill: '#ef4444', fontSize: 11 }} />
              )}
            </BarChart>
          </ResponsiveContainer>
        </Card.Body>
      </Card>
    </>
  )
}

// --- Main Page ---

function NutritionPage() {
  return (
    <>
      <h4 className="lm-section-header mb-4">Nutricao</h4>
      <Tabs defaultActiveKey="profile" className="mb-4">
        <Tab eventKey="profile" title="Perfil">
          <ProfileTab />
        </Tab>
        <Tab eventKey="mealplan" title="Plano Alimentar">
          <MealPlanTab />
        </Tab>
        <Tab eventKey="daily" title="Diario">
          <DailyLogTab />
        </Tab>
        <Tab eventKey="history" title="Historico">
          <HistoryTab />
        </Tab>
      </Tabs>
    </>
  )
}

export default NutritionPage

import { useState, useEffect } from 'react'
import { Row, Col, Card, Form, Button, Table, Alert, Tabs, Tab } from 'react-bootstrap'
import { api } from '../api/client'

function AdminPage() {
  const [actions, setActions] = useState([])
  const [trophies, setTrophies] = useState([])

  // Action form
  const [actionNome, setActionNome] = useState('')
  const [actionAreas, setActionAreas] = useState('')
  const [actionSinergia, setActionSinergia] = useState(false)
  const [actionMsg, setActionMsg] = useState(null)

  // Trophy form
  const [trophyNome, setTrophyNome] = useState('')
  const [trophyDesc, setTrophyDesc] = useState('')
  const [trophyEventos, setTrophyEventos] = useState('')
  const [trophyPeriodo, setTrophyPeriodo] = useState('')
  const [trophyExp, setTrophyExp] = useState('')
  const [trophyMsg, setTrophyMsg] = useState(null)

  const loadData = () => {
    api.getActions().then(setActions).catch(console.error)
    api.getTrophies().then(setTrophies).catch(console.error)
  }

  useEffect(() => { loadData() }, [])

  const handleAddAction = async (e) => {
    e.preventDefault()
    try {
      // Parse areas: "Saude:10, Mente:5" -> {"Saude": 10, "Mente": 5}
      const areas = {}
      actionAreas.split(',').forEach((part) => {
        const [key, val] = part.split(':').map((s) => s.trim())
        if (key && val) areas[key] = parseInt(val)
      })
      await api.createAction({ nome: actionNome, areas, sinergia: actionSinergia })
      setActionNome('')
      setActionAreas('')
      setActionSinergia(false)
      setActionMsg({ type: 'success', text: 'Ação criada!' })
      loadData()
    } catch (err) {
      setActionMsg({ type: 'danger', text: err.message })
    }
  }

  const handleDeleteAction = async (id) => {
    await api.deleteAction(id)
    loadData()
  }

  const handleAddTrophy = async (e) => {
    e.preventDefault()
    try {
      const criteria = { eventos: parseInt(trophyEventos) }
      if (trophyPeriodo) criteria.periodo = trophyPeriodo
      const recompensa = { exp: parseInt(trophyExp) || 100 }

      await api.createTrophy({ nome: trophyNome, descricao: trophyDesc, criteria, recompensa })
      setTrophyNome('')
      setTrophyDesc('')
      setTrophyEventos('')
      setTrophyPeriodo('')
      setTrophyExp('')
      setTrophyMsg({ type: 'success', text: 'Troféu criado!' })
      loadData()
    } catch (err) {
      setTrophyMsg({ type: 'danger', text: err.message })
    }
  }

  return (
    <Tabs defaultActiveKey="actions" className="mb-4">
      <Tab eventKey="actions" title="Ações">
        <Row>
          <Col md={5} className="mb-4">
            <Card>
              <Card.Body>
                <Card.Title>Nova Ação</Card.Title>
                {actionMsg && <Alert variant={actionMsg.type} dismissible onClose={() => setActionMsg(null)}>{actionMsg.text}</Alert>}
                <Form onSubmit={handleAddAction}>
                  <Form.Group className="mb-3">
                    <Form.Label>Nome</Form.Label>
                    <Form.Control value={actionNome} onChange={(e) => setActionNome(e.target.value)} required />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Áreas (ex: Saude:10, Mente:5)</Form.Label>
                    <Form.Control value={actionAreas} onChange={(e) => setActionAreas(e.target.value)} required
                      placeholder="Saude:10, Mente:5" />
                  </Form.Group>
                  <Form.Check className="mb-3" type="checkbox" label="Sinergia" checked={actionSinergia}
                    onChange={(e) => setActionSinergia(e.target.checked)} />
                  <Button type="submit" variant="primary">Criar</Button>
                </Form>
              </Card.Body>
            </Card>
          </Col>
          <Col md={7}>
            <Card>
              <Card.Body>
                <Card.Title>Ações Cadastradas</Card.Title>
                <Table striped bordered hover responsive size="sm">
                  <thead>
                    <tr><th>Nome</th><th>Áreas</th><th>Sinergia</th><th></th></tr>
                  </thead>
                  <tbody>
                    {actions.map((a) => (
                      <tr key={a.id}>
                        <td>{a.nome}</td>
                        <td>{Object.entries(a.areas || {}).map(([k, v]) => `${k}: ${v}`).join(', ')}</td>
                        <td>{a.sinergia ? 'Sim' : 'Não'}</td>
                        <td>
                          <Button size="sm" variant="outline-danger" onClick={() => handleDeleteAction(a.id)}>X</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Tab>

      <Tab eventKey="trophies" title="Troféus">
        <Row>
          <Col md={5} className="mb-4">
            <Card>
              <Card.Body>
                <Card.Title>Novo Troféu</Card.Title>
                {trophyMsg && <Alert variant={trophyMsg.type} dismissible onClose={() => setTrophyMsg(null)}>{trophyMsg.text}</Alert>}
                <Form onSubmit={handleAddTrophy}>
                  <Form.Group className="mb-2">
                    <Form.Label>Nome</Form.Label>
                    <Form.Control value={trophyNome} onChange={(e) => setTrophyNome(e.target.value)} required />
                  </Form.Group>
                  <Form.Group className="mb-2">
                    <Form.Label>Descrição</Form.Label>
                    <Form.Control value={trophyDesc} onChange={(e) => setTrophyDesc(e.target.value)} />
                  </Form.Group>
                  <Form.Group className="mb-2">
                    <Form.Label>Eventos necessários</Form.Label>
                    <Form.Control type="number" value={trophyEventos} onChange={(e) => setTrophyEventos(e.target.value)} required />
                  </Form.Group>
                  <Form.Group className="mb-2">
                    <Form.Label>Período (ex: 7d, 30d, vazio = total)</Form.Label>
                    <Form.Control value={trophyPeriodo} onChange={(e) => setTrophyPeriodo(e.target.value)} placeholder="7d" />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Recompensa XP</Form.Label>
                    <Form.Control type="number" value={trophyExp} onChange={(e) => setTrophyExp(e.target.value)} placeholder="100" />
                  </Form.Group>
                  <Button type="submit" variant="primary">Criar</Button>
                </Form>
              </Card.Body>
            </Card>
          </Col>
          <Col md={7}>
            <Card>
              <Card.Body>
                <Card.Title>Troféus Cadastrados</Card.Title>
                <Table striped bordered hover responsive size="sm">
                  <thead>
                    <tr><th>Nome</th><th>Descrição</th><th>Critério</th><th>XP</th></tr>
                  </thead>
                  <tbody>
                    {trophies.map((t) => (
                      <tr key={t.id}>
                        <td>{t.nome}</td>
                        <td>{t.descricao}</td>
                        <td>{t.criteria?.eventos} eventos{t.criteria?.periodo ? ` em ${t.criteria.periodo}` : ''}</td>
                        <td>{t.recompensa?.exp || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Tab>
    </Tabs>
  )
}

export default AdminPage

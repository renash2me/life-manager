import { useState, useEffect } from 'react'
import { Row, Col, Card, Table, Spinner, Button } from 'react-bootstrap'
import { api } from '../api/client'
import EventForm from '../components/EventForm'
import { fmtDate } from '../utils/date'

function EventsPage() {
  const [events, setEvents] = useState([])
  const [actions, setActions] = useState([])
  const [loading, setLoading] = useState(true)

  const actionsMap = {}
  actions.forEach((a) => { actionsMap[a.id] = a })

  const calcXp = (ev) => {
    const action = actionsMap[ev.actionId]
    if (!action || !action.areas) return 0
    let xp = Object.values(action.areas).reduce((s, v) => s + v, 0)
    if (action.sinergia && Object.keys(action.areas).length >= 2) {
      xp += Object.keys(action.areas).length
    }
    return xp
  }

  const loadData = () => {
    Promise.all([api.getEvents(), api.getActions()])
      .then(([evts, acts]) => {
        setEvents(evts)
        setActions(acts)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  const handleDelete = (ev) => {
    const xp = calcXp(ev)
    if (!window.confirm(`Deletar "${ev.actionNome || 'evento'}"? Isso remove ${xp} XP.`)) return
    api.deleteEvent(ev.id)
      .then(() => loadData())
      .catch(console.error)
  }

  useEffect(() => { loadData() }, [])

  if (loading) {
    return <div className="text-center mt-5"><Spinner animation="border" /></div>
  }

  return (
    <>
      <h4 className="lm-section-header mb-4">Eventos</h4>
      <Row>
        <Col md={4} className="mb-4">
          <EventForm actions={actions} onCreated={loadData} />
        </Col>
        <Col md={8}>
          <Card>
            <Card.Body>
              <Card.Title>Historico de Eventos</Card.Title>
              {events.length === 0 ? (
                <p className="text-muted">Nenhum evento registrado ainda.</p>
              ) : (
                <Table hover responsive size="sm" className="lm-table">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Acao</th>
                      <th>Descricao</th>
                      <th className="text-end">XP</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((ev) => (
                      <tr key={ev.id}>
                        <td>{fmtDate(ev.data)}</td>
                        <td>{ev.actionNome || `#${ev.actionId}`}</td>
                        <td>{ev.descricao || '-'}</td>
                        <td className="text-end" style={{ color: 'var(--lm-accent-green)' }}>+{calcXp(ev)}</td>
                        <td className="text-end" style={{ width: 40 }}>
                          <Button
                            variant="link"
                            size="sm"
                            className="p-0 text-danger"
                            title="Deletar evento"
                            onClick={() => handleDelete(ev)}
                          >
                            &#x1F5D1;
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default EventsPage

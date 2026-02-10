import { useState, useEffect } from 'react'
import { Row, Col, Card, Table, Spinner } from 'react-bootstrap'
import { api } from '../api/client'
import EventForm from '../components/EventForm'

function EventsPage() {
  const [events, setEvents] = useState([])
  const [actions, setActions] = useState([])
  const [loading, setLoading] = useState(true)

  const loadData = () => {
    Promise.all([api.getEvents(), api.getActions()])
      .then(([evts, acts]) => {
        setEvents(evts)
        setActions(acts)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  if (loading) {
    return <div className="text-center mt-5"><Spinner animation="border" /></div>
  }

  return (
    <Row>
      <Col md={4} className="mb-4">
        <EventForm actions={actions} onCreated={loadData} />
      </Col>
      <Col md={8}>
        <Card>
          <Card.Body>
            <Card.Title>Histórico de Eventos</Card.Title>
            {events.length === 0 ? (
              <p className="text-muted">Nenhum evento registrado ainda.</p>
            ) : (
              <Table striped bordered hover responsive size="sm">
                <thead>
                  <tr><th>Data</th><th>Ação</th><th>Descrição</th></tr>
                </thead>
                <tbody>
                  {events.map((ev) => (
                    <tr key={ev.id}>
                      <td>{ev.data}</td>
                      <td>{ev.actionNome || `#${ev.actionId}`}</td>
                      <td>{ev.descricao || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card.Body>
        </Card>
      </Col>
    </Row>
  )
}

export default EventsPage

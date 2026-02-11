import { useState } from 'react'
import { Card, Form, Button, Alert } from 'react-bootstrap'
import { api } from '../api/client'

function EventForm({ actions, onCreated }) {
  const [actionId, setActionId] = useState('')
  const [descricao, setDescricao] = useState('')
  const [data, setData] = useState(new Date().toISOString().slice(0, 10))
  const [gastoPlanejado, setGastoPlanejado] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!actionId) return
    setSubmitting(true)
    setFeedback(null)

    try {
      const result = await api.createEvent({
        actionId: parseInt(actionId),
        descricao,
        gastoPlanejado,
        data,
      })

      let msg = `+${result.xpGained} XP`
      if (result.leveledUp) msg += ' | LEVEL UP!'
      if (result.newTrophies?.length > 0) {
        msg += ` | Troféu: ${result.newTrophies.map((t) => t.nome).join(', ')}`
      }
      setFeedback({ type: 'success', msg })
      setDescricao('')
      setActionId('')
      onCreated?.()
    } catch (err) {
      setFeedback({ type: 'danger', msg: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="lm-form-card">
      <Card.Body>
        <Card.Title>Registrar Evento</Card.Title>
        {feedback && (
          <Alert variant={feedback.type} dismissible onClose={() => setFeedback(null)}>
            {feedback.msg}
          </Alert>
        )}
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Ação</Form.Label>
            <Form.Select value={actionId} onChange={(e) => setActionId(e.target.value)} required>
              <option value="">Selecione...</option>
              {(actions || []).map((a) => (
                <option key={a.id} value={a.id}>{a.nome}</option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Data</Form.Label>
            <Form.Control type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Descrição (opcional)</Form.Label>
            <Form.Control
              type="text"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="O que você fez?"
            />
          </Form.Group>

          <Form.Check
            className="mb-3"
            type="checkbox"
            label="Gasto planejado"
            checked={gastoPlanejado}
            onChange={(e) => setGastoPlanejado(e.target.checked)}
          />

          <Button type="submit" variant="success" disabled={submitting}>
            {submitting ? 'Registrando...' : 'Registrar'}
          </Button>
        </Form>
      </Card.Body>
    </Card>
  )
}

export default EventForm

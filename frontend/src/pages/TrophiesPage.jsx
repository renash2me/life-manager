import { useState, useEffect } from 'react'
import { Row, Col, Card, Spinner } from 'react-bootstrap'
import { api } from '../api/client'

function TrophiesPage() {
  const [trophies, setTrophies] = useState([])
  const [earned, setEarned] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.getTrophies(), api.getUserTrophies()])
      .then(([all, userTrophies]) => {
        setTrophies(all)
        setEarned(userTrophies)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="text-center mt-5"><Spinner animation="border" /></div>
  }

  const earnedIds = new Set(earned.map((t) => t.id))

  return (
    <>
      <h4 className="mb-4">Troféus</h4>
      <Row>
        {trophies.map((trophy) => {
          const isEarned = earnedIds.has(trophy.id)
          const earnedData = earned.find((t) => t.id === trophy.id)
          return (
            <Col md={4} lg={3} key={trophy.id} className="mb-4">
              <Card className={isEarned ? 'border-success' : ''} style={{ opacity: isEarned ? 1 : 0.5 }}>
                <Card.Body className="text-center">
                  <div style={{ fontSize: 40 }}>{isEarned ? '🏆' : '🔒'}</div>
                  <Card.Title className="mt-2">{trophy.nome}</Card.Title>
                  <Card.Text className="text-muted small">{trophy.descricao}</Card.Text>
                  <Card.Text>
                    <small className="text-muted">
                      {trophy.criteria?.eventos} eventos
                      {trophy.criteria?.periodo ? ` em ${trophy.criteria.periodo}` : ''}
                    </small>
                  </Card.Text>
                  {isEarned && earnedData?.earnedAt && (
                    <small className="text-success">
                      Conquistado em {earnedData.earnedAt.slice(0, 10)}
                    </small>
                  )}
                  {!isEarned && (
                    <small className="text-muted">+{trophy.recompensa?.exp || 0} XP</small>
                  )}
                </Card.Body>
              </Card>
            </Col>
          )
        })}
        {trophies.length === 0 && (
          <Col><p className="text-muted">Nenhum troféu cadastrado. Vá em Admin para criar.</p></Col>
        )}
      </Row>
    </>
  )
}

export default TrophiesPage

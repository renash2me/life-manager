import { Card, Table } from 'react-bootstrap'

const AREA_DISPLAY = {
  Saude: 'Saúde',
  Relacionamentos: 'Relacionamentos',
  'Vida Profissional': 'Vida Profissional',
  'Hobbies e Lazer': 'Hobbies e Lazer',
  Espirito: 'Espírito',
  Mente: 'Mente',
  Financas: 'Finanças',
}

const AREA_COLORS = {
  Saude: '#16a34a',
  Relacionamentos: '#f59e42',
  'Vida Profissional': '#a21caf',
  'Hobbies e Lazer': '#0ea5e9',
  Espirito: '#f43f5e',
  Mente: '#facc15',
  Financas: '#7c3aed',
}

function ScoreCard({ score }) {
  if (!score) return null

  return (
    <Card>
      <Card.Body>
        <Card.Title>Score do Dia</Card.Title>
        <h2 className="text-center mb-3">{score.total}</h2>
        <Table size="sm" borderless>
          <tbody>
            {Object.entries(score.porArea || {}).map(([area, val]) => (
              <tr key={area}>
                <td>
                  <span
                    style={{
                      display: 'inline-block',
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      backgroundColor: AREA_COLORS[area] || '#666',
                      marginRight: 8,
                    }}
                  />
                  {AREA_DISPLAY[area] || area}
                </td>
                <td className="text-end fw-bold">{val}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card.Body>
    </Card>
  )
}

export default ScoreCard

import { Card, ProgressBar } from 'react-bootstrap'

function LevelBadge({ user }) {
  if (!user) return null

  const xpPercent = user.nextLevelExp > 0
    ? Math.round((user.experience / user.nextLevelExp) * 100)
    : 0

  return (
    <Card className="text-center">
      <Card.Body>
        <Card.Title>Nível {user.level}</Card.Title>
        <Card.Text className="text-muted mb-1">
          {user.experience} / {user.nextLevelExp} XP
        </Card.Text>
        <ProgressBar
          now={xpPercent}
          label={`${xpPercent}%`}
          variant="success"
        />
        <Card.Text className="mt-2 fw-bold">{user.nome}</Card.Text>
      </Card.Body>
    </Card>
  )
}

export default LevelBadge

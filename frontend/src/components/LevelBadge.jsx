import { Card } from 'react-bootstrap'

function LevelBadge({ user }) {
  if (!user) return null

  const xpPercent = user.nextLevelExp > 0
    ? (user.experience / user.nextLevelExp) * 100
    : 0

  const radius = 56
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (xpPercent / 100) * circumference

  return (
    <Card className="lm-level-card text-center">
      <Card.Body>
        <div className="lm-level-ring-container">
          <svg width="130" height="130" viewBox="0 0 130 130">
            <circle
              cx="65" cy="65" r={radius}
              fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7"
            />
            <circle
              cx="65" cy="65" r={radius}
              fill="none" stroke="url(#lm-xp-gradient)" strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              transform="rotate(-90 65 65)"
              style={{ transition: 'stroke-dashoffset 0.8s ease' }}
            />
            <defs>
              <linearGradient id="lm-xp-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#7c3aed" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
          </svg>
          <div className="lm-level-number">{user.level}</div>
        </div>
        <p className="text-muted mb-1 mt-2" style={{ fontSize: '0.85rem' }}>
          {user.experience} / {user.nextLevelExp} XP
        </p>
        <p className="fw-bold mb-0">{user.nome}</p>
      </Card.Body>
    </Card>
  )
}

export default LevelBadge

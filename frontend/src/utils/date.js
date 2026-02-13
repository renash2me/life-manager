const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

/**
 * Formata data ISO (2026-02-10 ou datetime) para "10 fev 2026".
 * Se receber null/undefined retorna '--'.
 */
export function fmtDate(dateStr) {
  if (!dateStr) return '--'
  const s = String(dateStr).slice(0, 10) // "2026-02-10"
  const [y, m, d] = s.split('-')
  if (!y || !m || !d) return s
  return `${parseInt(d, 10)} ${MESES[parseInt(m, 10) - 1]} ${y}`
}

/**
 * Versao curta para eixos de graficos: "10 fev"
 */
export function fmtDateShort(dateStr) {
  if (!dateStr) return ''
  const s = String(dateStr).slice(0, 10)
  const [, m, d] = s.split('-')
  if (!m || !d) return s
  return `${parseInt(d, 10)} ${MESES[parseInt(m, 10) - 1]}`
}

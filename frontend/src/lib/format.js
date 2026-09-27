/** Small formatting helpers shared by every page. */

export function formatBytes(bytes, { decimals = 1 } = {}) {
  const value = Number(bytes)
  if (!Number.isFinite(value) || value <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const index = Math.min(units.length - 1, Math.floor(Math.log(value) / Math.log(1024)))
  const scaled = value / 1024 ** index
  return `${scaled.toFixed(index === 0 ? 0 : decimals)} ${units[index]}`
}

export function formatNumber(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return '0'
  return number.toLocaleString()
}

export function formatDuration(ms) {
  const value = Number(ms)
  if (!Number.isFinite(value) || value <= 0) return '—'
  if (value < 1000) return `${Math.round(value)} ms`
  if (value < 60000) return `${(value / 1000).toFixed(1)} s`
  return `${Math.floor(value / 60000)}m ${Math.round((value % 60000) / 1000)}s`
}

export function formatDate(value, { withTime = false } = {}) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  const options = withTime
    ? { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { year: 'numeric', month: 'short', day: 'numeric' }
  return date.toLocaleDateString(undefined, options)
}

export function relativeTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  const diff = date.getTime() - Date.now()
  const abs = Math.abs(diff)
  const units = [
    ['year', 31536000000],
    ['month', 2592000000],
    ['week', 604800000],
    ['day', 86400000],
    ['hour', 3600000],
    ['minute', 60000],
    ['second', 1000],
  ]
  try {
    const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
    for (const [unit, msPerUnit] of units) {
      if (abs >= msPerUnit || unit === 'second') {
        return formatter.format(Math.round(diff / msPerUnit), unit)
      }
    }
  } catch {
    /* fall through to an absolute date */
  }
  return formatDate(value)
}

export function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`
}

export function initials(name = '') {
  const letters = String(name)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || '')
    .join('')
    .toUpperCase()
  return letters || '?'
}

export function truncate(text = '', length = 140) {
  const value = String(text)
  if (value.length <= length) return value
  return `${value.slice(0, length - 1).trimEnd()}…`
}

/** "Page 12" / "Section 3" — matches the backend's location_unit field. */
export function locationLabel(unit, value) {
  if (value === null || value === undefined || value === '') return null
  const noun = unit === 'section' ? 'Section' : unit === 'line' ? 'Line' : 'Page'
  return `${noun} ${value}`
}
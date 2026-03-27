export function isInIframe(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.self !== window.top
  } catch {
    return true
  }
}

const KNOWN_ORIGINS = [
  'https://efecto.app',
  'https://www.efecto.app',
  'http://localhost:3000',
  'http://localhost:3001',
]

function getTargetOrigin(): string {
  if (typeof document === 'undefined') return '*'
  try {
    const referrer = document.referrer
    if (referrer) {
      const url = new URL(referrer)
      const origin = url.origin
      if (KNOWN_ORIGINS.includes(origin)) return origin
    }
  } catch {
    // Invalid referrer URL
  }
  return '*'
}

export function sendTeamToParent(team: unknown) {
  if (!isInIframe()) return
  window.parent.postMessage(
    { type: 'designteam:team-selected', team },
    getTargetOrigin()
  )
}

export function sendTeamClearedToParent() {
  if (!isInIframe()) return
  window.parent.postMessage(
    { type: 'designteam:team-cleared' },
    getTargetOrigin()
  )
}

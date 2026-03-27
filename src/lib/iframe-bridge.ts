export function isInIframe(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.self !== window.top
  } catch {
    return true
  }
}

export function sendTeamToParent(team: unknown) {
  if (!isInIframe()) return
  window.parent.postMessage(
    { type: 'designteam:team-selected', team },
    '*'
  )
}

export function sendTeamClearedToParent() {
  if (!isInIframe()) return
  window.parent.postMessage(
    { type: 'designteam:team-cleared' },
    '*'
  )
}

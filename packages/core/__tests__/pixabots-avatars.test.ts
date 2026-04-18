import { describe, it, expect } from 'vitest'
import {
  PIXABOTS_API,
  ROLE_PIXABOT_IDS,
  pixabotUrl,
  pixabotUrlForRole,
} from '../src/pixabots-avatars'
import { AGENT_ROLES } from '../src/types'

describe('PIXABOTS_API', () => {
  it('points to the canonical endpoint', () => {
    expect(PIXABOTS_API).toBe('https://pixabots.com/api/pixabot')
  })
})

describe('ROLE_PIXABOT_IDS', () => {
  it('has an id for every canonical AgentRole', () => {
    for (const role of AGENT_ROLES) {
      expect(ROLE_PIXABOT_IDS[role], `missing id for ${role}`).toBeDefined()
      expect(ROLE_PIXABOT_IDS[role]).toMatch(/^[0-9a-z]{4}$/)
    }
  })

  it('ids are unique across roles', () => {
    const ids = Object.values(ROLE_PIXABOT_IDS)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('pixabotUrl', () => {
  it('builds URL with default size 240', () => {
    expect(pixabotUrl('2515')).toBe('https://pixabots.com/api/pixabot/2515?size=240')
  })

  it('builds URL with custom size', () => {
    expect(pixabotUrl('2515', 480)).toBe('https://pixabots.com/api/pixabot/2515?size=480')
  })

  it('supports small sizes', () => {
    expect(pixabotUrl('abcd', 64)).toBe('https://pixabots.com/api/pixabot/abcd?size=64')
  })
})

describe('pixabotUrlForRole', () => {
  it('returns URL for known role', () => {
    const url = pixabotUrlForRole('creative-director')
    expect(url).toBe('https://pixabots.com/api/pixabot/2515?size=240')
  })

  it('honors custom size', () => {
    const url = pixabotUrlForRole('researcher', 960)
    expect(url).toBe('https://pixabots.com/api/pixabot/3051?size=960')
  })

  it('returns null for unknown role', () => {
    expect(pixabotUrlForRole('not-a-role')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(pixabotUrlForRole('')).toBeNull()
  })

  it('resolves all known roles', () => {
    for (const role of AGENT_ROLES) {
      expect(pixabotUrlForRole(role)).toMatch(/^https:\/\/pixabots\.com\/api\/pixabot\/[0-9a-z]{4}\?size=240$/)
    }
  })
})

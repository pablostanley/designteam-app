/**
 * Pixabots Avatars — single source of truth for per-role pixel-art avatar IDs.
 *
 * Stable pixabotIds per role so the same role always shows the same character
 * across designteam app, Efecto agent panel, CLI, etc.
 */

import type { AgentRole } from './types'

/** Base URL. Use pixabotUrl() instead of concatenating yourself. */
export const PIXABOTS_API = 'https://pixabots.com/api/pixabot'

/** Stable pixabotIds per role — consistent character identity across all consumers. */
export const ROLE_PIXABOT_IDS: Record<AgentRole, string> = {
  'researcher': '3051',
  'copywriter': 'a241',
  'graphic-designer': '7130',
  'ux-designer': '1462',
  'ux-writer': 'b053',
  'editorial-designer': '5324',
  'social-media-designer': 'c160',
  'creative-director': '2515',
  'design-engineer': '8043',
  'brand-strategist': '4232',
  'marketing-strategist': 'd351',
  'print-designer': '6124',
  'motion-designer': 'e240',
  'accessibility-specialist': '0453',
  'content-strategist': '9132',
  'seo-specialist': 'f061',
}

/** Build a Pixabots URL for the given id and size. */
export function pixabotUrl(pixabotId: string, size = 240): string {
  return `${PIXABOTS_API}/${pixabotId}?size=${size}`
}

/**
 * Resolve a Pixabots URL for a role, or null if the key isn't a known role.
 * Accepts a string (not strictly typed as AgentRole) because callers often
 * pass `avatarKey` from legacy data that may contain unknown values.
 */
export function pixabotUrlForRole(avatarKey: string, size = 240): string | null {
  const id = ROLE_PIXABOT_IDS[avatarKey as AgentRole]
  return id ? pixabotUrl(id, size) : null
}

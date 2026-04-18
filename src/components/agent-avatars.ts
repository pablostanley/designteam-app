import { randomPixabotId, ROLE_PIXABOT_IDS, pixabotUrl, pixabotUrlForRole } from '@designteam/core'

/**
 * Legacy PNG fallback. Only fires when `avatarKey` isn't a known role
 * (e.g., corrupt/old saved team data passing a renamed or removed role).
 * Every current role has a pixabot in ROLE_PIXABOT_IDS, so this is dead for
 * normal use — kept for defensive UX on legacy data.
 */
export const AVATAR_MAP: Record<string, string> = {
  'researcher': '/images/robots/researcher.png',
  'copywriter': '/images/robots/copywriter.png',
  'graphic-designer': '/images/robots/graphic-designer.png',
  'ux-designer': '/images/robots/ux-designer.png',
  'ux-writer': '/images/robots/ux-writer.png',
  'editorial-designer': '/images/robots/editorial-designer.png',
  'social-media-designer': '/images/robots/social-media-designer.png',
  'creative-director': '/images/robots/creative-director.png',
  'design-engineer': '/images/robots/design-engineer.png',
  'brand-strategist': '/images/robots/brand-strategist.png',
  'marketing-strategist': '/images/robots/marketing-strategist.png',
  'print-designer': '/images/robots/print-designer.png',
  'motion-designer': '/images/robots/motion-designer.png',
  'accessibility-specialist': '/images/robots/accessibility-specialist.png',
  'content-strategist': '/images/robots/content-strategist.png',
  'seo-specialist': '/images/robots/seo-specialist.png',
}

/**
 * Get avatar source for an agent.
 * Priority: agent's pixabotId → role's stable pixabotId → legacy PNG fallback.
 */
export function getAvatarSrc(avatarKey: string, pixabotId?: string): string {
  if (pixabotId) return pixabotUrl(pixabotId)
  const roleUrl = pixabotUrlForRole(avatarKey)
  if (roleUrl) return roleUrl
  return AVATAR_MAP[avatarKey] ?? '/images/robots/creative-director.png'
}

/** Get a random Pixabot URL (for homepage hero, decorative use) */
export function getRandomPixabotSrc(size = 240): string {
  return pixabotUrl(randomPixabotId(), size)
}

export { randomPixabotId, ROLE_PIXABOT_IDS }

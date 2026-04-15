import { randomPixabotId } from '@designteam/core'

const PIXABOTS_API = 'https://pixabots.com/api/pixabot'

/** Stable pixabotIds per role — consistent character identity across the app */
export const ROLE_PIXABOT_IDS: Record<string, string> = {
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

/** Legacy fallback — static PNGs */
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
  if (pixabotId) {
    return `${PIXABOTS_API}/${pixabotId}?size=240`
  }
  const roleId = ROLE_PIXABOT_IDS[avatarKey]
  if (roleId) {
    return `${PIXABOTS_API}/${roleId}?size=240`
  }
  return AVATAR_MAP[avatarKey] ?? '/images/robots/creative-director.png'
}

/** Get a random Pixabot URL (for homepage hero, decorative use) */
export function getRandomPixabotSrc(size = 240): string {
  return `${PIXABOTS_API}/${randomPixabotId()}?size=${size}`
}

export { randomPixabotId }

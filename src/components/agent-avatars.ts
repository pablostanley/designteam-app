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

export function getAvatarSrc(avatarKey: string): string {
  return AVATAR_MAP[avatarKey] ?? '/images/robots/creative-director.png'
}

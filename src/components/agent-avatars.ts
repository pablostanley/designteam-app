export const AVATAR_MAP: Record<string, string> = {
  detective: '/images/robots/detective.png',
  musician: '/images/robots/musician.png',
  skater: '/images/robots/skater.png',
  doctor: '/images/robots/doctor.png',
  ducky: '/images/robots/ducky.png',
  umbrella: '/images/robots/umbrella.png',
  surfer: '/images/robots/surfer.png',
  chef: '/images/robots/chef.png',
}

export function getAvatarSrc(key: string): string {
  return AVATAR_MAP[key] ?? '/images/robots/ducky.png'
}

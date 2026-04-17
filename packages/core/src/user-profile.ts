/**
 * User Profile — who the user is, what they care about.
 *
 * Stored locally in `.designteam/user.json` (optionally synced to Supabase
 * if logged in). Every agent reads this to tailor their work to the user.
 */

export interface UserProfile {
  /** User's name or handle */
  name?: string
  /** Business or product name */
  business?: string
  /** One-line description of what the business does */
  businessDescription?: string
  /** Industry (B2B SaaS, e-commerce, etc.) */
  industry?: string
  /** Target audience */
  audience?: string
  /** Primary goals (growth, retention, brand awareness, etc.) */
  goals?: string[]
  /** Voice/tone preferences */
  voice?: string
  /** Visual style preferences */
  style?: string
  /** Brand colors, if any */
  brandColors?: string[]
  /** Free-form notes */
  notes?: string
  /** ISO 8601 — last time the profile was updated */
  updatedAt: string
}

export function createEmptyUserProfile(): UserProfile {
  return { updatedAt: new Date().toISOString() }
}

export function updateUserProfile(
  profile: UserProfile,
  updates: Partial<UserProfile>,
): UserProfile {
  return {
    ...profile,
    ...updates,
    updatedAt: new Date().toISOString(),
  }
}

/** Format the user profile for injection into agent system prompts. */
export function userProfileToPromptFragment(profile: UserProfile): string {
  if (!profile || Object.keys(profile).length <= 1) return ''

  const lines: string[] = []
  lines.push('## ABOUT THE USER')
  lines.push('')

  if (profile.name) lines.push(`**Name:** ${profile.name}`)
  if (profile.business) {
    const desc = profile.businessDescription ? ` — ${profile.businessDescription}` : ''
    lines.push(`**Business:** ${profile.business}${desc}`)
  }
  if (profile.industry) lines.push(`**Industry:** ${profile.industry}`)
  if (profile.audience) lines.push(`**Audience:** ${profile.audience}`)
  if (profile.goals && profile.goals.length > 0) {
    lines.push(`**Goals:** ${profile.goals.join(', ')}`)
  }
  if (profile.voice) lines.push(`**Voice:** ${profile.voice}`)
  if (profile.style) lines.push(`**Visual style:** ${profile.style}`)
  if (profile.brandColors && profile.brandColors.length > 0) {
    lines.push(`**Brand colors:** ${profile.brandColors.join(', ')}`)
  }
  if (profile.notes) {
    lines.push('')
    lines.push(profile.notes)
  }

  return lines.join('\n')
}

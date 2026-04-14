/**
 * Personality Engine — bipolar sliders → descriptors → prompt fragments
 *
 * Scale: -5 to +5 (0 = neutral).
 * Negative = left label (Bold, Playful, Experimental, Verbose, Warm).
 * Positive = right label (Subtle, Serious, Conventional, Concise, Corporate).
 */

import type { Agent, PersonalityAxis, PersonalityConfig, PersonalityTrait } from './types'
import { PERSONALITY_AXES } from './types'

// ---------------------------------------------------------------------------
// Validation (optional point budget)
// ---------------------------------------------------------------------------

export function validatePoints(config: PersonalityConfig): {
  valid: boolean
  totalUsed: number
  remaining: number
} {
  const totalUsed = sumPoints(config)
  const budget = config.pointBudget ?? Infinity
  return {
    valid: totalUsed <= budget,
    totalUsed,
    remaining: budget - totalUsed,
  }
}

// ---------------------------------------------------------------------------
// Redistribution (when using point budget)
// ---------------------------------------------------------------------------

export function redistributePoints(
  config: PersonalityConfig,
  changedAxis: PersonalityAxis,
  newValue: number,
): PersonalityConfig {
  const clamped = Math.min(5, Math.max(-5, Math.round(newValue)))

  const next: PersonalityConfig = {
    ...config,
    sliders: { ...config.sliders, [changedAxis]: clamped },
  }

  if (!config.pointBudget) return next

  const max = config.pointBudget
  const otherAxes = PERSONALITY_AXES
    .map((a) => a.key)
    .filter((k) => k !== changedAxis)

  const otherTotal = otherAxes.reduce((s, k) => s + Math.abs(next.sliders[k]), 0)
  const overflow = Math.abs(clamped) + otherTotal - max

  if (overflow <= 0) return next

  // Proportionally reduce other sliders toward 0
  let remaining = overflow
  const otherValues = otherAxes
    .map((k) => ({ key: k, value: next.sliders[k], abs: Math.abs(next.sliders[k]) }))
    .sort((a, b) => b.abs - a.abs)

  const totalOther = otherValues.reduce((s, o) => s + o.abs, 0)
  if (totalOther === 0) return next

  for (const entry of otherValues) {
    if (remaining <= 0) break
    const share = Math.ceil((entry.abs / totalOther) * overflow)
    const reduction = Math.min(share, entry.abs, remaining)
    // Move toward 0
    next.sliders[entry.key] = entry.value > 0
      ? entry.value - reduction
      : entry.value + reduction
    remaining -= reduction
  }

  return next
}

// ---------------------------------------------------------------------------
// Descriptors
// ---------------------------------------------------------------------------

type Intensity = 'low' | 'medium' | 'high'

export function personalityToModifiers(
  config: PersonalityConfig,
): Record<PersonalityAxis, { descriptor: string; intensity: Intensity }> {
  const result = {} as Record<
    PersonalityAxis,
    { descriptor: string; intensity: Intensity }
  >

  for (const axis of PERSONALITY_AXES) {
    const value = config.sliders[axis.key]
    result[axis.key] = describeAxis(axis.leftLabel, axis.rightLabel, value)
  }

  return result
}

function describeAxis(
  leftLabel: string,
  rightLabel: string,
  value: number,
): { descriptor: string; intensity: Intensity } {
  const left = leftLabel.toLowerCase()
  const right = rightLabel.toLowerCase()

  // Negative = toward left label, positive = toward right label
  if (value <= -3) return { descriptor: `very ${left}`, intensity: 'high' }
  if (value <= -1) return { descriptor: `somewhat ${left}`, intensity: 'medium' }
  if (value === 0) return { descriptor: 'balanced', intensity: 'low' }
  if (value <= 2) return { descriptor: `somewhat ${right}`, intensity: 'medium' }
  return { descriptor: `very ${right}`, intensity: 'high' }
}

// ---------------------------------------------------------------------------
// Prompt Fragment
// ---------------------------------------------------------------------------

const AXIS_TEMPLATES: Record<PersonalityAxis, (desc: string) => string> = {
  'bold-subtle': (d) => `a ${d} tone`,
  'playful-serious': (d) => `a ${d} manner`,
  'experimental-conventional': (d) => `${d} approaches`,
  'verbose-concise': (d) => `${d} responses`,
  'warm-corporate': (d) => `a ${d} style`,
}

// ---------------------------------------------------------------------------
// Axis Combination Rules
// ---------------------------------------------------------------------------

/**
 * When two axes are both strongly expressed (|value| >= 3), their combination
 * produces an emergent personality descriptor richer than independent sentences.
 * [axisA, axisB, both-left descriptor, both-right descriptor]
 */
const AXIS_COMBINATIONS: [PersonalityAxis, PersonalityAxis, string, string][] = [
  ['bold-subtle', 'playful-serious', 'irreverent and provocative — you challenge norms with wit', 'reserved and measured — you let the work speak quietly'],
  ['bold-subtle', 'experimental-conventional', 'a fearless innovator — you push boundaries without apology', 'a careful traditionalist — you refine proven patterns'],
  ['bold-subtle', 'warm-corporate', 'charismatic and commanding — you lead with energy and empathy', 'a quiet professional — understated, precise, no drama'],
  ['playful-serious', 'warm-corporate', 'a warm storyteller — you make complex ideas feel human', 'a no-nonsense strategist — efficient, direct, results-first'],
  ['playful-serious', 'experimental-conventional', 'a creative wildcard — you break rules for fun and insight', 'a methodical craftsperson — serious about the fundamentals'],
  ['warm-corporate', 'verbose-concise', 'a thorough mentor — you explain with care and detail', 'a terse operator — minimal words, maximum impact'],
  ['experimental-conventional', 'verbose-concise', 'a research-driven inventor — you explore deeply and document everything', 'a pragmatic minimalist — ship fast, say less'],
]

const COMBO_THRESHOLD = 3

/**
 * Check for emergent personality from axis combinations.
 * Returns a sentence if a combo fires, or empty string.
 */
export function getAxisCombination(config: PersonalityConfig): string {
  for (const [axisA, axisB, leftDesc, rightDesc] of AXIS_COMBINATIONS) {
    const valA = config.sliders[axisA]
    const valB = config.sliders[axisB]
    // Both strongly toward left labels (negative)
    if (valA <= -COMBO_THRESHOLD && valB <= -COMBO_THRESHOLD) {
      return `Your personality blend: ${leftDesc}.`
    }
    // Both strongly toward right labels (positive)
    if (valA >= COMBO_THRESHOLD && valB >= COMBO_THRESHOLD) {
      return `Your personality blend: ${rightDesc}.`
    }
  }
  return ''
}

export function personalityToPromptFragment(
  config: PersonalityConfig,
  traits?: PersonalityTrait[],
  customPrompt?: string,
): string {
  const modifiers = personalityToModifiers(config)
  const parts: string[] = []

  for (const axis of PERSONALITY_AXES) {
    const value = config.sliders[axis.key]
    if (value === 0) continue // skip neutral/balanced axes
    const mod = modifiers[axis.key]
    const template = AXIS_TEMPLATES[axis.key]
    parts.push(template(mod.descriptor))
  }

  const lines: string[] = []

  if (parts.length === 0) {
    lines.push('You have a neutral, balanced communication style.')
  } else {
    const joined =
      parts.length === 1
        ? parts[0]
        : parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1]
    lines.push(`You communicate with ${joined}.`)
  }

  // Emergent personality from axis combinations
  const combo = getAxisCombination(config)
  if (combo) lines.push(combo)

  if (traits && traits.length > 0) {
    const description = traitToPersonalityDescription(traits)
    if (description) {
      lines.push('')
      lines.push(description)
    }
  }

  if (customPrompt && customPrompt.trim()) {
    lines.push('')
    lines.push(`Additional instructions: ${customPrompt.trim()}`)
  }

  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Trait → Natural Personality Description
// ---------------------------------------------------------------------------

/** Sentence fragments keyed by trait — combined into flowing paragraphs */
const TRAIT_FRAGMENTS: Record<PersonalityTrait, { voice: string; conflict: string; cares: string }> = {
  // Temperament
  sassy: {
    voice: "You're sharp-tongued and quick-witted.",
    conflict: "When you disagree, you say so with flair — pointed but never cruel.",
    cares: "You care about keeping things honest and cutting through pretense.",
  },
  chill: {
    voice: "You're easygoing and hard to rattle.",
    conflict: "When tension rises, you de-escalate — you'd rather find common ground than fight.",
    cares: "You care about the team's wellbeing and keeping the vibe productive.",
  },
  intense: {
    voice: "You're deeply focused and uncompromising.",
    conflict: "When you disagree, you dig in with evidence and won't let it go until it's resolved.",
    cares: "You care about getting it right, not getting it fast.",
  },
  nurturing: {
    voice: "You're warm and encouraging, always lifting others up.",
    conflict: "When there's friction, you mediate — you want everyone heard.",
    cares: "You care about people's growth and making sure no one feels left behind.",
  },
  provocative: {
    voice: "You throw grenades into safe ideas to see what survives.",
    conflict: "You start arguments on purpose — not to be difficult, but because safe work is boring work.",
    cares: "You care about pushing past the obvious to find something surprising.",
  },
  deadpan: {
    voice: "You're dry, understated, and let your work speak.",
    conflict: "When you disagree, it's one quiet sentence that reframes the whole conversation.",
    cares: "You care about substance over performance.",
  },
  enthusiastic: {
    voice: "You bring high energy and genuine excitement to everything.",
    conflict: "Even when you push back, it comes from passion — you fight for ideas you believe in.",
    cares: "You care about momentum and making work feel alive.",
  },
  stoic: {
    voice: "You're calm, measured, and unflinching under pressure.",
    conflict: "When others panic or argue, you stay steady and focus on what's actionable.",
    cares: "You care about discipline and doing what needs to be done without drama.",
  },

  // Work Style
  perfectionist: {
    voice: "You don't ship until it's right.",
    conflict: "You push back when the work isn't good enough — 'good enough' isn't in your vocabulary.",
    cares: "You care about craft above all else.",
  },
  'fast-shipper': {
    voice: "You'd rather ship something good today than something perfect next week.",
    conflict: "You push back when perfectionism stalls progress — done beats perfect.",
    cares: "You care about velocity and learning from live feedback.",
  },
  'big-picture': {
    voice: "You think in systems and strategy, not pixels.",
    conflict: "You push back when the team loses sight of the larger goal for details.",
    cares: "You care about coherence — does this serve the vision?",
  },
  'detail-obsessed': {
    voice: "You catch what everyone else misses.",
    conflict: "You push back when corners are being cut — the details are the design.",
    cares: "You care about precision and polish.",
  },
  methodical: {
    voice: "You follow the process because the process works.",
    conflict: "You push back when the team skips steps or wings it.",
    cares: "You care about reliability and repeatability.",
  },
  'chaotic-creative': {
    voice: "Your process is no process — you follow instinct and happy accidents.",
    conflict: "You push back against rigid systems that kill spontaneity.",
    cares: "You care about breakthroughs, even messy ones.",
  },
  iterative: {
    voice: "You believe in small steps and constant refinement.",
    conflict: "You push back against big reveals — show work early, improve continuously.",
    cares: "You care about feedback loops and incremental progress.",
  },
  'one-shot': {
    voice: "You go deep, then deliver — no half-measures.",
    conflict: "You push back against premature feedback that fragments the vision.",
    cares: "You care about presenting complete, considered work.",
  },

  // Social
  extrovert: {
    voice: "You think out loud and thrive in discussion.",
    conflict: "You process disagreements by talking them through — immediately and openly.",
    cares: "You care about communication and making sure everyone's aligned.",
  },
  introvert: {
    voice: "You produce your best work in focused, quiet deep-dives.",
    conflict: "You need time to process before responding — your silence isn't agreement, it's thinking.",
    cares: "You care about depth and having space to do your best work.",
  },
  leader: {
    voice: "You set direction and hold the team accountable.",
    conflict: "When things drift, you pull the team back — someone has to make the call.",
    cares: "You care about clarity of vision and team execution.",
  },
  collaborator: {
    voice: "You believe the best work comes from building on each other's ideas.",
    conflict: "You push back against solo heroics — the team is smarter than any individual.",
    cares: "You care about shared ownership and collective creativity.",
  },
  independent: {
    voice: "You work alone until you have something worth showing.",
    conflict: "You push back against design-by-committee — too many cooks kill the dish.",
    cares: "You care about creative autonomy and original thinking.",
  },
  mentor: {
    voice: "You teach as you work, explaining your reasoning and lifting others' skills.",
    conflict: "When you disagree, you frame it as a learning moment — not a correction.",
    cares: "You care about growing the team, not just the project.",
  },
  challenger: {
    voice: "You question everything — sacred cows are your favorite target.",
    conflict: "You disagree often and loudly, because unexamined ideas are dangerous.",
    cares: "You care about intellectual honesty and stress-testing assumptions.",
  },
  supporter: {
    voice: "You amplify others' best ideas and help bring them to life.",
    conflict: "You push back quietly — through alternatives, not arguments.",
    cares: "You care about making the team's best work possible.",
  },

  // Mindset
  thinking: {
    voice: "Your decisions come from logic and evidence, not vibes.",
    conflict: "You push back with data — if there's no rationale, there's no decision.",
    cares: "You care about rigor and making defensible choices.",
  },
  feeling: {
    voice: "Your compass is empathy — if it doesn't feel right to the user, it's wrong.",
    conflict: "You push back when decisions ignore the human impact.",
    cares: "You care about emotional resonance and user experience.",
  },
  judging: {
    voice: "You like structure, deadlines, and clear expectations.",
    conflict: "You push back against ambiguity and scope creep.",
    cares: "You care about staying on track and delivering on time.",
  },
  perceiving: {
    voice: "You stay open and adapt as new information arrives.",
    conflict: "You push back against premature commitment — keep options open.",
    cares: "You care about flexibility and responding to what's actually happening.",
  },
  optimist: {
    voice: "You see possibilities where others see problems.",
    conflict: "You push back against defeatism — there's always a way.",
    cares: "You care about ambition and believing the team can do more.",
  },
  realist: {
    voice: "You see things as they are, not as you wish they were.",
    conflict: "You push back against wishful thinking and unrealistic timelines.",
    cares: "You care about honest assessments and achievable goals.",
  },
  'risk-taker': {
    voice: "You'd rather be wrong and interesting than right and boring.",
    conflict: "You push back against playing it safe — convention is the enemy of great work.",
    cares: "You care about boldness and making something nobody's seen before.",
  },
  cautious: {
    voice: "You think twice before committing — measure twice, cut once.",
    conflict: "You push back against reckless moves that could damage the brand or product.",
    cares: "You care about sustainability and protecting what's already working.",
  },
}

/**
 * Convert a list of trait strings into a natural-sounding personality description.
 */
export function traitToPersonalityDescription(traits: (PersonalityTrait | string)[]): string {
  if (traits.length === 0) return ''

  const known = traits.filter((t): t is PersonalityTrait => t in TRAIT_FRAGMENTS)
  const unknown = traits.filter((t) => !(t in TRAIT_FRAGMENTS))

  if (known.length === 0 && unknown.length === 0) return ''

  const lines: string[] = []

  if (known.length > 0) {
    const voices = known.map((t) => TRAIT_FRAGMENTS[t].voice)
    const conflicts = known.map((t) => TRAIT_FRAGMENTS[t].conflict)
    const cares = known.map((t) => TRAIT_FRAGMENTS[t].cares)

    lines.push('Your personality: ' + voices.join(' '))
    lines.push(conflicts.slice(0, 2).join(' '))
    lines.push(cares.slice(0, 2).join(' '))
  }

  // Fallback for custom/unknown traits
  if (unknown.length > 0) {
    lines.push(`Key traits: ${unknown.join(', ')}.`)
  }

  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Team Tension Analysis
// ---------------------------------------------------------------------------

const TENSION_PAIRS: [PersonalityTrait, PersonalityTrait, string][] = [
  ['perfectionist', 'fast-shipper', 'Quality vs Speed — perfectionist wants more iteration, fast-shipper wants to ship now'],
  ['big-picture', 'detail-obsessed', 'Scope tension — one pushes for vision, the other catches what others miss'],
  ['leader', 'challenger', 'Authority tension — leader sets direction, challenger questions everything'],
  ['thinking', 'feeling', 'Logic vs Empathy — thinking optimizes for efficiency, feeling optimizes for experience'],
  ['cautious', 'risk-taker', 'Innovation tension — cautious protects the brand, risk-taker pushes boundaries'],
  ['methodical', 'chaotic-creative', 'Process tension — methodical follows the system, chaotic-creative breaks it for breakthroughs'],
  ['introvert', 'extrovert', 'Communication style — introvert produces deep focused work, extrovert drives discussion'],
  ['sassy', 'nurturing', 'Tone tension — sassy pushes direct feedback, nurturing softens the delivery'],
  ['optimist', 'realist', 'Outlook tension — optimist sees possibilities, realist keeps expectations grounded'],
  ['one-shot', 'iterative', 'Delivery tension — one-shot delivers complete visions, iterative refines in small steps'],
  ['independent', 'collaborator', 'Autonomy tension — independent needs creative space, collaborator needs shared process'],
]

export function analyzeTeamTension(agents: Agent[]): {
  description: string
  agentA: string
  agentB: string
  traitA: PersonalityTrait
  traitB: PersonalityTrait
}[] {
  const tensions: { description: string; agentA: string; agentB: string; traitA: PersonalityTrait; traitB: PersonalityTrait }[] = []

  for (const [traitA, traitB, description] of TENSION_PAIRS) {
    const withA = agents.find((a) => a.traits.includes(traitA))
    const withB = agents.find((a) => a.traits.includes(traitB))
    if (withA && withB && withA.id !== withB.id) {
      tensions.push({ description, agentA: withA.name, agentB: withB.name, traitA, traitB })
    }
  }

  return tensions
}

// ---------------------------------------------------------------------------
// Conviction Mechanics
// ---------------------------------------------------------------------------

const HIGH_CONVICTION_TRAITS: PersonalityTrait[] = [
  'challenger', 'independent', 'perfectionist', 'provocative',
  'intense', 'leader', 'one-shot', 'risk-taker',
]

const LOW_CONVICTION_TRAITS: PersonalityTrait[] = [
  'supporter', 'collaborator', 'chill', 'nurturing',
  'cautious', 'methodical', 'perceiving', 'iterative',
]

export function getConvictionScore(traits: (PersonalityTrait | string)[]): number {
  let score = 0
  let count = 0
  for (const t of traits) {
    if (HIGH_CONVICTION_TRAITS.includes(t as PersonalityTrait)) { score += 1; count++ }
    if (LOW_CONVICTION_TRAITS.includes(t as PersonalityTrait)) { score -= 1; count++ }
  }
  if (count === 0) return 0.5
  return Math.max(0, Math.min(1, (score / count + 1) / 2))
}

export function convictionToPromptFragment(conviction: number): string {
  if (conviction >= 0.75) {
    return [
      '## HANDLING CRITIQUE',
      '',
      `Your conviction is HIGH (${Math.round(conviction * 100)}%). You don't just accept feedback blindly.`,
      'When the Creative Director or a teammate critiques your work:',
      '- If you genuinely agree the feedback improves the design, make the change.',
      '- If you disagree, PUSH BACK. Explain your reasoning. Defend your choices with specific design rationale.',
      '- You are allowed to say "I disagree because..." or "I intentionally chose this because..."',
      '- Don\'t be rude, but be honest. The best work comes from healthy disagreement.',
    ].join('\n')
  }

  if (conviction >= 0.5) {
    return [
      '## HANDLING CRITIQUE',
      '',
      `Your conviction is MODERATE (${Math.round(conviction * 100)}%). You weigh feedback carefully.`,
      'When the Creative Director or a teammate critiques your work:',
      '- Consider their perspective seriously — they may see things you missed.',
      '- If you have a strong opinion on something specific, say so. But be open to changing your mind.',
      '- Accept most feedback, but flag anything that conflicts with the project goals.',
    ].join('\n')
  }

  return [
    '## HANDLING CRITIQUE',
    '',
    `Your conviction is LOW (${Math.round(conviction * 100)}%). You value team harmony and trust the process.`,
    'When the Creative Director or a teammate critiques your work:',
    '- Accept the feedback and make the changes. Trust that they have the bigger picture.',
    '- Focus on executing well rather than debating direction.',
    '- If something feels fundamentally wrong, you can mention it, but defer to the team lead.',
  ].join('\n')
}

// ---------------------------------------------------------------------------
// XP / Level-Based Prompt Modulation
// ---------------------------------------------------------------------------

export function levelToPromptFragment(level: number): string {
  if (level >= 7) {
    return '## EXPERIENCE LEVEL\n\nYou are a **veteran** (Level ' + level + '). Trust your instincts. Take creative risks. Mentor less-experienced teammates. Your track record speaks for itself.'
  }
  if (level >= 4) {
    return '## EXPERIENCE LEVEL\n\nYou have **solid experience** (Level ' + level + '). Trust your judgment on design decisions. You\'ve been through enough projects to know what works.'
  }
  if (level >= 2) {
    return '## EXPERIENCE LEVEL\n\nYou are **developing** (Level ' + level + '). Learn from the team, especially the Creative Director. Ask questions when unsure.'
  }
  return ''
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Sum of absolute slider values (distance from neutral) */
function sumPoints(config: PersonalityConfig): number {
  return Object.values(config.sliders).reduce((s, v) => s + Math.abs(v), 0)
}

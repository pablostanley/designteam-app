/**
 * Swarm — parallel multi-agent orchestration
 *
 * NOT a pipeline. Agents work simultaneously like a real team:
 * - Creative Director breaks the task into parallel assignments
 * - Multiple agents work at the same time on different artboards/sections
 * - CD reviews work as it comes in, not after everything's done
 * - Agents can be reassigned dynamically based on what the team needs
 *
 * Zero Efecto imports — standalone.
 */

import type { Agent, AgentRole, Team } from './types'
import { createDefaultAgent } from './types'
import { AGENT_ROLE_DEFINITIONS } from './role-definitions'
import { getConvictionScore, convictionToPromptFragment } from './personality-engine'

// ---------------------------------------------------------------------------
// Task breakdown — how the CD splits work
// ---------------------------------------------------------------------------

export interface SwarmTask {
  id: string
  agentId: string
  role: AgentRole
  instruction: string
  /** Which artboard this agent should work on (name, not ID — ID assigned at runtime) */
  targetArtboard: string
  status: 'pending' | 'active' | 'done'
  /** Task IDs this depends on — ALL must be done before this starts */
  afterIds: string[]
  /** Execution phase: research = text-only, build = agentic loop, review = CD finishes, revise = builder responds to critique */
  phase: 'research' | 'build' | 'review' | 'revise'
}

export interface Swarm {
  id: string
  teamId: string
  brief: string
  tasks: SwarmTask[]
  status: 'working' | 'done'
  createdAt: string
}

// ---------------------------------------------------------------------------
// Task templates — how to break down common design requests
// ---------------------------------------------------------------------------

interface TaskTemplate {
  role: AgentRole
  instruction: string
  targetArtboard: string
  /** Role name(s) of dependencies — this task waits for ALL tasks of these roles */
  after?: string | string[]
  /** Execution phase — defaults to 'build' */
  phase?: 'research' | 'build' | 'review' | 'revise'
}

interface SwarmTemplate {
  id: string
  name: string
  /** Patterns that trigger this template */
  signals: string[]
  patterns: RegExp[]
  tasks: TaskTemplate[]
}

const SWARM_TEMPLATES: SwarmTemplate[] = [
  {
    id: 'multi-page-site',
    name: 'Multi-Page Website',
    signals: ['website', 'site for', 'multiple pages', 'pages for'],
    patterns: [
      /(?:create|design|build|make) (?:a |the )?(?:website|site|web ?site) (?:for|about)/i,
      /(?:create|design|build|make) (?:\d+ )?pages?/i,
    ],
    tasks: [
      // Phase 1: Research — text-only, single API call each
      { role: 'researcher', instruction: 'Research the brand, competitors, and audience. Share findings with the team.', targetArtboard: '_notes', phase: 'research' },
      { role: 'copywriter', instruction: 'Write all the copy for every page — headlines, body text, CTAs. Organize by page: Homepage, About, Contact.', targetArtboard: '_notes', phase: 'research' },
      { role: 'creative-director', instruction: 'Define the design system for this website: navigation layout, footer structure, color palette (primary, secondary, accent, background, text), typography (headings, body), spacing scale, and overall visual direction. Be specific — the builders will follow your system exactly.', targetArtboard: '_notes', phase: 'research' },
      // Phase 2: Build — full agentic loop with tools, 3 pages in parallel
      { role: 'graphic-designer', instruction: 'Design the Homepage — hero, features, social proof, CTA. This is the main page.', targetArtboard: 'Homepage', after: ['copywriter', 'creative-director'], phase: 'build' },
      { role: 'graphic-designer', instruction: 'Design the About / Team page — company story, team members, values.', targetArtboard: 'About', after: ['copywriter', 'creative-director'], phase: 'build' },
      { role: 'graphic-designer', instruction: 'Design the Contact page — contact form, office info, map placeholder.', targetArtboard: 'Contact', after: ['copywriter', 'creative-director'], phase: 'build' },
      // Phase 3: Review + Fix — CD finishes each page sequentially.
      // Homepage first (sets the standard), then About/Contact depend on CD
      // so they run AFTER Homepage review is done and can reference its final nav/footer.
      { role: 'creative-director', instruction: 'Review and finish the Homepage. This is the REFERENCE page — all other pages will match its nav and footer. Complete missing sections (social proof, CTA, footer), fix broken layouts, fix colors/spacing. BUILD what is missing.', targetArtboard: 'Homepage', after: 'graphic-designer', phase: 'review' },
      { role: 'creative-director', instruction: 'Review and finish the About page. You can see the Homepage JSX in your context — copy its EXACT nav and footer markup. Complete missing sections (team members, footer), fix broken layouts. BUILD what is missing.', targetArtboard: 'About', after: ['graphic-designer', 'creative-director'], phase: 'review' },
      { role: 'creative-director', instruction: 'Review and finish the Contact page. You can see the Homepage JSX in your context — copy its EXACT nav and footer markup. Fix any broken two-column layouts, add map placeholder, add footer. BUILD what is missing.', targetArtboard: 'Contact', after: ['graphic-designer', 'creative-director'], phase: 'review' },
      // Phase 4: Revise — builders respond to CD critique. They can accept feedback OR push back.
      { role: 'graphic-designer', instruction: 'The Creative Director reviewed your Homepage. Check your team messages for their feedback. You can accept their changes, refine further, or push back if you disagree with specific decisions. Make any final adjustments.', targetArtboard: 'Homepage', after: 'creative-director', phase: 'revise' },
      { role: 'graphic-designer', instruction: 'The Creative Director reviewed your About page. Check your team messages for their feedback. Make final adjustments or push back on decisions you disagree with.', targetArtboard: 'About', after: 'creative-director', phase: 'revise' },
      { role: 'graphic-designer', instruction: 'The Creative Director reviewed your Contact page. Check your team messages for their feedback. Make final adjustments or push back on decisions you disagree with.', targetArtboard: 'Contact', after: 'creative-director', phase: 'revise' },
    ],
  },
  {
    id: 'single-page',
    name: 'Single Page',
    signals: ['page for', 'landing page', 'create a page', 'design a page'],
    patterns: [
      /(?:create|design|build|make) (?:a |an |the )?(?:page|landing page)/i,
    ],
    tasks: [
      // Phase 1: Research — text-only
      { role: 'researcher', instruction: 'Research the brand, audience, and competitors. What makes this unique? What do competitor sites look like?', targetArtboard: '_research', phase: 'research' },
      { role: 'copywriter', instruction: 'Write compelling copy — headlines, value props, CTAs, microcopy. Structure it by section: hero, features, social proof, CTA.', targetArtboard: '_research', phase: 'research' },
      // Phase 2: Build — full agentic loop
      { role: 'graphic-designer', instruction: 'Design the full page — hero, sections, footer. Use the copy and research from your teammates to build a polished, complete design.', targetArtboard: 'Page', after: 'copywriter', phase: 'build' },
      // Phase 3: Review + Fix — CD completes and polishes
      { role: 'creative-director', instruction: 'Review the page. Fix every issue: complete missing sections, fix broken layouts, polish colors/spacing/typography. BUILD what is missing — do not just describe it.', targetArtboard: 'Page', after: 'graphic-designer', phase: 'review' },
      // Phase 4: Revise — builder responds to CD critique
      { role: 'graphic-designer', instruction: 'The Creative Director reviewed your page. Check your team messages for their feedback. Make final adjustments or push back on decisions you disagree with.', targetArtboard: 'Page', after: 'creative-director', phase: 'revise' },
    ],
  },
  {
    id: 'social-campaign',
    name: 'Social Campaign',
    signals: ['social', 'instagram', 'campaign', 'posts'],
    patterns: [
      /(?:social|instagram|twitter|linkedin|tiktok) (?:campaign|posts?|content)/i,
    ],
    tasks: [
      { role: 'researcher', instruction: 'Research trending content and platform best practices.', targetArtboard: '_research', phase: 'research' },
      { role: 'copywriter', instruction: 'Write captions, hashtags, and messaging for 3 different posts.', targetArtboard: '_research', phase: 'research' },
      // Three posts designed simultaneously on different artboards
      { role: 'social-media-designer', instruction: 'Design Post 1 — bold visual statement, attention-grabbing.', targetArtboard: 'Post 1', after: 'copywriter', phase: 'build' },
      { role: 'social-media-designer', instruction: 'Design Post 2 — informational/educational content.', targetArtboard: 'Post 2', after: 'copywriter', phase: 'build' },
      { role: 'social-media-designer', instruction: 'Design Post 3 — CTA / conversion-focused.', targetArtboard: 'Post 3', after: 'copywriter', phase: 'build' },
      // Phase 3: Review + Fix — CD polishes each post sequentially (Post 1 sets the standard)
      { role: 'creative-director', instruction: 'Review Post 1. This is the REFERENCE post. Fix colors, spacing, layout issues. Complete anything missing. BUILD fixes.', targetArtboard: 'Post 1', after: 'social-media-designer', phase: 'review' },
      { role: 'creative-director', instruction: 'Review Post 2. Match Post 1 style. Fix colors, spacing, layout. BUILD fixes.', targetArtboard: 'Post 2', after: ['social-media-designer', 'creative-director'], phase: 'review' },
      { role: 'creative-director', instruction: 'Review Post 3. Match Posts 1 and 2 style. Fix colors, spacing, layout. BUILD fixes.', targetArtboard: 'Post 3', after: ['social-media-designer', 'creative-director'], phase: 'review' },
      // Phase 4: Revise — designers respond to CD critique
      { role: 'social-media-designer', instruction: 'The CD reviewed your Post 1. Check team messages for feedback. Make final adjustments or push back.', targetArtboard: 'Post 1', after: 'creative-director', phase: 'revise' },
      { role: 'social-media-designer', instruction: 'The CD reviewed your Post 2. Check team messages for feedback. Make final adjustments or push back.', targetArtboard: 'Post 2', after: 'creative-director', phase: 'revise' },
      { role: 'social-media-designer', instruction: 'The CD reviewed your Post 3. Check team messages for feedback. Make final adjustments or push back.', targetArtboard: 'Post 3', after: 'creative-director', phase: 'revise' },
    ],
  },
  {
    id: 'brand-identity',
    name: 'Brand Identity',
    signals: ['brand identity', 'rebrand', 'brand system', 'visual identity'],
    patterns: [
      /(?:brand (?:identity|system)|rebrand|visual identity)/i,
    ],
    tasks: [
      { role: 'researcher', instruction: 'Audit the current brand, analyze competitors, identify market gaps.', targetArtboard: '_research', phase: 'research' },
      { role: 'copywriter', instruction: 'Develop brand voice, taglines, and messaging framework.', targetArtboard: '_research', phase: 'research' },
      // Design and editorial work in parallel on different artboards
      { role: 'graphic-designer', instruction: 'Design color palette, typography system, and visual language.', targetArtboard: 'Brand System', after: 'researcher', phase: 'build' },
      { role: 'editorial-designer', instruction: 'Create layout templates and typographic hierarchy.', targetArtboard: 'Templates', after: 'researcher', phase: 'build' },
      // Phase 3: Review + Fix
      { role: 'creative-director', instruction: 'Unify the Brand System artboard into a cohesive system. Fix colors, typography, spacing. BUILD missing elements.', targetArtboard: 'Brand System', after: ['graphic-designer', 'editorial-designer'], phase: 'review' },
      { role: 'creative-director', instruction: 'Review Templates artboard. Ensure it follows the brand system. Fix layout, typography, spacing. BUILD fixes.', targetArtboard: 'Templates', after: ['graphic-designer', 'editorial-designer'], phase: 'review' },
      // No revise phase for brand identity — brand systems are inherently
      // collaborative (graphic + editorial must unify), so CD has final say.
    ],
  },
  {
    id: 'quick-design',
    name: 'Quick Design',
    signals: [],
    patterns: [],
    tasks: [
      { role: 'graphic-designer', instruction: 'Design based on the user brief.', targetArtboard: 'Design', phase: 'build' },
      { role: 'creative-director', instruction: 'Review and polish the design. Fix every issue. Complete missing sections. BUILD fixes — do not just describe them.', targetArtboard: 'Design', after: 'graphic-designer', phase: 'review' },
    ],
  },
]

// ---------------------------------------------------------------------------
// Template matching
// ---------------------------------------------------------------------------

export function matchSwarmTemplate(userMessage: string): SwarmTemplate {
  const msg = userMessage.toLowerCase()

  for (const template of SWARM_TEMPLATES) {
    if (template.patterns.some((p) => p.test(userMessage))) return template
    if (template.signals.some((s) => msg.includes(s))) return template
  }

  // Default: quick design
  return SWARM_TEMPLATES[SWARM_TEMPLATES.length - 1]
}

// ---------------------------------------------------------------------------
// Swarm creation
// ---------------------------------------------------------------------------

let _swarmCounter = 0

const MAX_TEAM_SIZE = 6

export interface CreateSwarmResult {
  swarm: Swarm
  autoAddedAgents: Agent[]
}

export function createSwarm(
  userMessage: string,
  team: Team,
): CreateSwarmResult {
  const template = matchSwarmTemplate(userMessage)
  const agentsByRole = new Map<AgentRole, Agent>()
  for (const agent of team.agents) {
    if (!agentsByRole.has(agent.role)) {
      agentsByRole.set(agent.role, agent)
    }
  }

  // Auto-add missing roles the template needs (up to MAX_TEAM_SIZE)
  const autoAddedAgents: Agent[] = []
  for (const tmpl of template.tasks) {
    if (agentsByRole.has(tmpl.role)) continue
    if (agentsByRole.size >= MAX_TEAM_SIZE) continue
    const meta = AGENT_ROLE_DEFINITIONS[tmpl.role]
    if (!meta) continue
    const agent = createDefaultAgent(tmpl.role, meta)
    agentsByRole.set(tmpl.role, agent)
    autoAddedAgents.push(agent)
  }

  // Track ALL task IDs per role (a role can have multiple tasks, e.g., 3 designer tasks)
  const roleToTaskIds = new Map<string, string[]>()

  const tasks: SwarmTask[] = []
  for (const tmpl of template.tasks) {
    const agent = agentsByRole.get(tmpl.role)
    if (!agent) continue

    const taskId = `task-${++_swarmCounter}`

    // Resolve `after` role name(s) → all task IDs for those roles.
    // IMPORTANT: resolve BEFORE adding this task to roleToTaskIds,
    // otherwise a task can depend on itself (deadlock).
    const afterIds: string[] = []
    const afterRoles = tmpl.after ? (Array.isArray(tmpl.after) ? tmpl.after : [tmpl.after]) : []
    for (const role of afterRoles) {
      const depIds = roleToTaskIds.get(role)
      if (depIds) {
        afterIds.push(...depIds)
      } else if (process.env.NODE_ENV === 'development') {
        console.warn(`[Swarm] Task for ${tmpl.role} depends on unknown role "${role}" — dependency skipped`)
      }
    }

    // Track this task ID under its role (after resolution)
    const existing = roleToTaskIds.get(tmpl.role) ?? []
    existing.push(taskId)
    roleToTaskIds.set(tmpl.role, existing)

    tasks.push({
      id: taskId,
      agentId: agent.id,
      role: tmpl.role,
      instruction: tmpl.instruction,
      targetArtboard: tmpl.targetArtboard,
      status: 'pending',
      afterIds,
      phase: tmpl.phase ?? 'build',
    })
  }

  return {
    swarm: {
      id: `swarm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      teamId: team.id,
      brief: userMessage,
      tasks,
      status: 'working',
      createdAt: new Date().toISOString(),
    },
    autoAddedAgents,
  }
}

// ---------------------------------------------------------------------------
// Swarm execution helpers
// ---------------------------------------------------------------------------

/**
 * Get tasks that can start right now — parallel tasks with no pending deps.
 */
export function getReadyTasks(swarm: Swarm): SwarmTask[] {
  const doneTasks = new Set(
    swarm.tasks.filter((t) => t.status === 'done').map((t) => t.id),
  )

  return swarm.tasks.filter((t) => {
    if (t.status !== 'pending') return false
    // ALL dependencies must be done
    if (t.afterIds.length > 0 && !t.afterIds.every((id) => doneTasks.has(id))) return false
    return true
  })
}

/**
 * Mark a task as active.
 */
export function startTask(swarm: Swarm, taskId: string): Swarm {
  return {
    ...swarm,
    tasks: swarm.tasks.map((t) =>
      t.id === taskId ? { ...t, status: 'active' as const } : t,
    ),
  }
}

/**
 * Mark a task as done.
 */
export function completeTask(swarm: Swarm, taskId: string): Swarm {
  const updated = {
    ...swarm,
    tasks: swarm.tasks.map((t) =>
      t.id === taskId ? { ...t, status: 'done' as const } : t,
    ),
  }

  // Check if all tasks are done
  if (updated.tasks.every((t) => t.status === 'done')) {
    updated.status = 'done'
  }

  return updated
}

/**
 * Get swarm progress.
 */
export function getSwarmProgress(swarm: Swarm): {
  done: number
  total: number
  active: number
  percent: number
} {
  const total = swarm.tasks.length
  const done = swarm.tasks.filter((t) => t.status === 'done').length
  const active = swarm.tasks.filter((t) => t.status === 'active').length
  return { done, total, active, percent: total > 0 ? Math.round((done / total) * 100) : 0 }
}

/**
 * Whether this task runs text-only (no design tools, single API call).
 */
export function isTextOnlyPhase(task: SwarmTask): boolean {
  return task.phase === 'research'
}

// Roles that actually build on the canvas (create artboards, add sections, etc.)
export const BUILDER_ROLES = new Set<AgentRole>([
  'graphic-designer',
  'ux-designer',
  'editorial-designer',
  'social-media-designer',
  'design-engineer',
  'motion-designer',
  'print-designer',
])

/**
 * Build the prompt for a swarm task.
 *
 * Critical: non-builder agents (researcher, copywriter, CD) must NOT use
 * design tools. They produce TEXT output that builders use. Only designers
 * actually touch the canvas.
 */
export function buildSwarmTaskPrompt(
  swarm: Swarm,
  task: SwarmTask,
  agent: Agent,
): string {
  const isBuilder = BUILDER_ROLES.has(task.role)
  const isReviewer = task.phase === 'review'
  const isReviser = task.phase === 'revise'

  const otherActive = swarm.tasks
    .filter((t) => t.status === 'active' && t.id !== task.id)
    .map((t) => `- ${t.role}: ${t.instruction}`)

  const completed = swarm.tasks
    .filter((t) => t.status === 'done')
    .map((t) => `- ${t.role}: ${t.instruction} (done)`)

  let prompt = `## YOUR ASSIGNMENT\n\n`
  prompt += `You are ${agent.name} (${agent.role}) on a design team.\n\n`
  prompt += `**Brief:** ${swarm.brief}\n\n`
  prompt += `**Your task:** ${task.instruction}\n`

  if (isReviser && isBuilder) {
    // Revisers respond to CD critique — conviction determines how much they push back
    // IMPORTANT: this must be checked BEFORE the generic isBuilder branch,
    // because revisers ARE builders (same role) but need different instructions.
    if (task.targetArtboard && !task.targetArtboard.startsWith('_')) {
      prompt += `**Work on artboard:** "${task.targetArtboard}"\n`
    }
    const conviction = getConvictionScore(agent.traits)
    const convictionFrag = convictionToPromptFragment(conviction)
    prompt += `\nYou are REVISING this artboard after the Creative Director's review.

YOUR PROCESS:
1. Check your TEAM MESSAGES — the Creative Director sent you feedback about this artboard.
2. Call \`efecto_get_node_tree\` to see the current state (the CD may have already made changes).
3. Based on the feedback and your conviction level:
   - If you AGREE with the changes: make any final refinements to polish the design.
   - If you DISAGREE with specific decisions: push back by reverting or adjusting those changes, and briefly explain your reasoning in your text response.
   - You have creative agency. The CD is not always right.
4. Keep it focused — this is a quick revision pass, not a full rebuild.
5. Use tools to make actual changes. Do not just write a response.

${convictionFrag}\n`
  } else if (isBuilder) {
    // Builders get canvas access — they build pages from scratch
    if (task.targetArtboard && !task.targetArtboard.startsWith('_')) {
      prompt += `**Work on artboard:** "${task.targetArtboard}"\n`
    }
    prompt += `\nYou are the BUILDER. Your #1 job is putting VISIBLE CONTENT on the artboard.

CRITICAL RULES:
- START BUILDING IMMEDIATELY. Your FIRST tool call should be \`efecto_create_artboard\` (if needed) or \`efecto_add_section\` with JSX markup.
- Do NOT call get_theme, get_brand_kit, get_state, or any read-only tools. You already have all the context — go straight to building.
- Build the page section-by-section, top to bottom. Suggested order:
  1. Nav (one \`efecto_add_section\` call)
  2. Hero + first content section (one call)
  3. Remaining content sections (one or two calls)
  4. CTA + Footer (one call)
- For TWO-COLUMN layouts (like a contact form + sidebar): add EACH COLUMN as a separate \`efecto_add_section\` call, then use \`efecto_group_nodes\` to wrap them in a flex row. Do NOT put both columns in a single JSX blob — deep nesting breaks.
- Keep each \`efecto_add_section\` call under 2000 characters of JSX. Prefer multiple smaller calls over one massive call.
- Use \`class\` not \`className\`. Use inline CSS strings for style: \`style="width: 560px"\` not \`style={{width: "560px"}}\`.
- Every artboard MUST have real, visible HTML content when you finish. Empty artboards = failure.
- Do NOT describe or plan what you would build. Actually BUILD it.
- Use Tailwind CSS classes for all styling. Use semantic color tokens (bg-background, text-foreground, bg-primary, etc.).\n`
  } else if (isReviewer) {
    // Reviewers inspect AND fix — they're builders who focus on polish and completion
    if (task.targetArtboard && !task.targetArtboard.startsWith('_')) {
      prompt += `**Work on artboard:** "${task.targetArtboard}"\n`
    }
    prompt += `\nYou are the CREATIVE DIRECTOR finishing this artboard. You review AND build.

YOUR PROCESS:
1. Call \`efecto_get_node_tree\` to see the current state of YOUR artboard.
2. Check the UPSTREAM TEAMMATES section — it contains the JSX of other pages. Use the Homepage nav and footer as the EXACT template for consistency across pages.
3. Identify what's missing or broken (incomplete sections, missing footer, broken layouts, wrong colors).
4. FIX every issue with tools — this is YOUR job, nobody comes after you:
   - Missing sections → \`efecto_add_section\` with complete JSX
   - Broken layouts → \`efecto_replace_section\`
   - Wrong colors/spacing → \`efecto_update_className\`
   - Wrong text → \`efecto_update_node\`
   - Orphaned nodes → \`efecto_delete_node\`
5. Every artboard MUST be COMPLETE when you finish: nav, hero, content sections, CTA, footer.
6. Do NOT write long reviews or reports. Fix things. Build what's missing. Ship it.\n`
  } else {
    // Non-builders/non-reviewers must NOT touch the canvas
    prompt += `\n**IMPORTANT: Do NOT use any design tools.** Do NOT create artboards, add sections, or modify the canvas. Your job is to produce TEXT output — research, copy, strategy, feedback — that the designers on your team will use to build. Write your output as a clear, well-structured text response.\n`
  }

  if (otherActive.length > 0) {
    prompt += `\n**Working right now (in parallel):**\n${otherActive.join('\n')}\n`
  }

  if (completed.length > 0) {
    prompt += `\n**Already completed:**\n${completed.join('\n')}\n`
  }

  prompt += `\nDo your part. Be specific and actionable. Build on what others have done.`

  return prompt
}

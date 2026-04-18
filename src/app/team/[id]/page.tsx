"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getAvatarSrc } from "@/components/agent-avatars"
import { AGENT_ROLE_DEFINITIONS } from "@/lib/agent-builder/role-definitions"
import { CopyButton } from "@/components/copy-button"
import { UserMenu } from "@/components/user-menu"
import { AgentDetailSheet } from "@/components/agent-detail-sheet"
import { RelationshipMap } from "@/components/relationship-map"
import type { Team, AgentRole, AgentMemoryEntry, AgentRelationship, EmotionalState } from "@/lib/agent-builder/types"
import { PERSONALITY_AXES, LEVEL_THRESHOLDS } from "@/lib/agent-builder/types"
import { getMood, getMoodEmoji } from "@designteam/core"

interface TeamRow {
  team_data: Team
  name: string
  agent_count: number
  short_id: string
}

// Shape returned by /api/teams/:id/state (agent_states table row)
interface AgentStateRow {
  agent_id: string
  role: string
  emotions: EmotionalState
  memories?: AgentMemoryEntry[]
  xp: number
  level: number
  tasks_completed: number
  tasks_approved: number
  last_active_at: string | null
  updated_at: string | null
}

type MemoryCategory = 'brand' | 'project' | 'user' | 'decision' | 'fact'

interface TeamMemoryRow {
  id: string
  category: MemoryCategory
  content: string
  salience: number
  source: string | null
  created_at: string
  last_relevant_at: string
}

const MEMORY_CATEGORY_META: Record<MemoryCategory, { label: string; hint: string }> = {
  brand: { label: 'Brand', hint: 'Visual identity, voice, tone' },
  project: { label: 'Project', hint: 'What we’re building right now' },
  user: { label: 'User', hint: 'Preferences, working style' },
  decision: { label: 'Decisions', hint: 'Choices the team has made' },
  fact: { label: 'Facts', hint: 'Everything else worth remembering' },
}
const MEMORY_CATEGORY_ORDER: MemoryCategory[] = ['brand', 'project', 'user', 'decision', 'fact']

export default function TeamPage() {
  const params = useParams()
  const id = params.id as string
  const [team, setTeam] = useState<Team | null>(null)
  const [dbName, setDbName] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [forking, setForking] = useState(false)
  const [states, setStates] = useState<Record<string, AgentStateRow>>({})
  const [memoryEntries, setMemoryEntries] = useState<TeamMemoryRow[]>([])
  const [detailAgentId, setDetailAgentId] = useState<string | null>(null)
  const [relationships, setRelationships] = useState<AgentRelationship[]>([])

  useEffect(() => {
    fetch(`/api/teams/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error)
        } else {
          const row = data.team as TeamRow
          setTeam(row.team_data)
          setDbName(row.name)
        }
        setLoading(false)
      })
      .catch(() => {
        setError("Failed to load team")
        setLoading(false)
      })

    // Living state — mood, XP, level per agent. Best-effort; failure keeps
    // the page usable (agents just show without the living-state chips).
    fetch(`/api/teams/${id}/state`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (!data) return
        if (Array.isArray(data.agent_states)) {
          const next: Record<string, AgentStateRow> = {}
          for (const row of data.agent_states as AgentStateRow[]) {
            next[row.agent_id] = row
          }
          setStates(next)
        }
        if (Array.isArray(data.relationships)) {
          setRelationships(data.relationships as AgentRelationship[])
        }
      })
      .catch(() => { /* ignore — no living state yet is fine */ })

    // Team memory — shared brand/project/user/decision facts.
    fetch(`/api/teams/${id}/memory`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (Array.isArray(data?.entries)) setMemoryEntries(data.entries as TeamMemoryRow[])
      })
      .catch(() => { /* ignore — empty memory is the most common state */ })
  }, [id])

  async function handleFork() {
    setForking(true)
    try {
      const res = await fetch(`/api/teams/${id}/fork`, { method: "POST" })
      const data = await res.json()
      if (data.team) {
        // Fetch the full forked team
        const fullRes = await fetch(`/api/teams/${data.team.short_id}`)
        const fullData = await fullRes.json()
        if (fullData.team?.team_data) {
          try {
            localStorage.setItem(
              "designteam-current",
              JSON.stringify(fullData.team.team_data),
            )
          } catch {
            // Storage full or unavailable
          }
          window.location.href = "/build"
          return
        }
      }
      // Fallback: redirect to URL if provided
      if (data.url) {
        window.location.href = data.url
      }
    } finally {
      setForking(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="mx-auto max-w-4xl px-4 py-4">
            <div className="h-5 w-24 bg-muted rounded animate-pulse" />
          </div>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-8">
          <div className="h-8 w-64 bg-muted rounded animate-pulse mb-2" />
          <div className="h-4 w-24 bg-muted rounded animate-pulse mb-8" />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-48 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        </main>
      </div>
    )
  }

  if (error || !team) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Team not found</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-sm font-semibold">
            Design Team
          </Link>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleFork}
              disabled={forking}
            >
              {forking ? "Forking..." : "Fork this team"}
            </Button>
            <Link href="/build">
              <Button>Build your own</Button>
            </Link>
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-bold">{dbName || team.name}</h1>
        <p className="mt-1 text-muted-foreground">
          {team.agents?.length ?? 0} agents
        </p>

        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {team.agents?.map((agent) => {
            const role =
              AGENT_ROLE_DEFINITIONS[agent.role as AgentRole] ?? null
            const state = states[agent.id]
            const mood = state ? getMood(state.emotions) : null
            const moodEmoji = mood ? getMoodEmoji(mood) : null
            // XP progress inside current level — clamped to [0, 1].
            const xpProgress = state
              ? xpProgressInLevel(state.xp, state.level)
              : null
            return (
              <button
                key={agent.id}
                onClick={() => setDetailAgentId(agent.id)}
                className="space-y-2 rounded-lg border p-4 text-left transition-colors hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-foreground/30 cursor-pointer"
              >
                <div className="relative mx-auto w-20 h-20">
                  <Image
                    src={getAvatarSrc(role?.avatarKey ?? "creative-director", agent.pixabotId)}
                    alt={agent.name}
                    width={80}
                    height={80}
                    className="object-contain"
                    unoptimized
                    style={{ imageRendering: 'pixelated' }}
                  />
                  {moodEmoji && (
                    <span
                      className="absolute -bottom-1 -right-1 text-lg"
                      title={`Mood: ${mood}`}
                    >
                      {moodEmoji}
                    </span>
                  )}
                </div>
                <h3 className="text-center font-semibold">{agent.name}</h3>
                <div className="flex justify-center items-center gap-1.5">
                  <Badge
                    variant="outline"
                    style={role ? { borderColor: role.color } : undefined}
                  >
                    {role?.displayName ?? agent.role}
                  </Badge>
                  {state && state.level > 1 && (
                    <Badge variant="secondary" className="text-[10px]" title={`${state.xp} XP`}>
                      Lv {state.level}
                    </Badge>
                  )}
                </div>
                {state && xpProgress !== null && (
                  <div className="flex flex-col items-center gap-0.5 pt-0.5">
                    <div
                      className="h-1 w-16 rounded-full bg-muted overflow-hidden"
                      title={`${state.xp} XP — ${state.tasks_approved}/${state.tasks_completed} tasks approved`}
                    >
                      <div
                        className="h-full bg-foreground transition-[width] duration-500"
                        style={{ width: `${Math.round(xpProgress * 100)}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-muted-foreground">
                      {state.tasks_completed} task{state.tasks_completed === 1 ? "" : "s"}
                    </span>
                  </div>
                )}
                {agent.traits && agent.traits.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-1">
                    {agent.traits.map((t) => (
                      <Badge
                        key={t}
                        variant="secondary"
                        className="text-[10px]"
                      >
                        {t}
                      </Badge>
                    ))}
                  </div>
                )}
                {agent.personality?.sliders && (
                  <div className="flex flex-wrap justify-center gap-x-2 gap-y-0.5 pt-1">
                    {Object.entries(agent.personality.sliders).map(
                      ([axis, value]) => {
                        if (value === 0) return null
                        const axisMeta = PERSONALITY_AXES.find(
                          (a) => a.key === axis,
                        )
                        if (!axisMeta) return null
                        const label =
                          value < 0
                            ? axisMeta.leftLabel
                            : axisMeta.rightLabel
                        const intensity =
                          Math.abs(value) >= 3 ? "very" : "somewhat"
                        return (
                          <span
                            key={axis}
                            className="text-xs text-muted-foreground"
                          >
                            {intensity} {label.toLowerCase()}
                          </span>
                        )
                      },
                    )}
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {relationships.length > 0 && team.agents && team.agents.length >= 2 && (
          <section className="mt-10">
            <header className="mb-3 flex items-baseline justify-between">
              <h2 className="text-sm font-semibold">Relationships</h2>
              <span className="text-xs text-muted-foreground">
                {relationships.length} pair{relationships.length === 1 ? "" : "s"}
              </span>
            </header>
            <div className="rounded-lg border p-4">
              <RelationshipMap agents={team.agents} relationships={relationships} />
            </div>
          </section>
        )}

        {memoryEntries.length > 0 && (
          <section className="mt-10">
            <header className="mb-3 flex items-baseline justify-between">
              <h2 className="text-sm font-semibold">Team memory</h2>
              <span className="text-xs text-muted-foreground">
                {memoryEntries.length} entr{memoryEntries.length === 1 ? "y" : "ies"}
              </span>
            </header>
            <div className="space-y-4">
              {MEMORY_CATEGORY_ORDER.map((cat) => {
                const entries = memoryEntries.filter((e) => e.category === cat)
                if (entries.length === 0) return null
                const meta = MEMORY_CATEGORY_META[cat]
                return (
                  <div key={cat} className="rounded-lg border p-4">
                    <div className="mb-2 flex items-baseline justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-wider">
                        {meta.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{meta.hint}</span>
                    </div>
                    <ul className="space-y-1.5">
                      {entries.map((entry) => (
                        <li
                          key={entry.id}
                          className="flex items-start gap-2 rounded-md bg-muted/40 px-2.5 py-2"
                        >
                          <span
                            className={
                              "mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full " +
                              (entry.salience >= 0.7
                                ? "bg-foreground"
                                : entry.salience >= 0.4
                                  ? "bg-muted-foreground"
                                  : "bg-muted-foreground/50")
                            }
                            aria-hidden
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs leading-snug">{entry.content}</p>
                            {entry.source && (
                              <p className="mt-0.5 text-[10px] text-muted-foreground">
                                via {entry.source}
                              </p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        <div className="mt-8 space-y-3">
          <div className="rounded-lg border bg-muted/50 p-4">
            <p className="mb-2 text-sm font-medium">
              Install this team:
            </p>
            <div className="flex items-center gap-2">
              <code className="rounded bg-background px-3 py-1.5 text-sm font-mono">
                npx designteam install {id}
              </code>
              <CopyButton text={`npx designteam install ${id}`} />
            </div>
          </div>
          <div className="rounded-lg border bg-muted/50 p-4">
            <p className="mb-2 text-sm font-medium">
              Or install the full skill set:
            </p>
            <div className="flex items-center gap-2">
              <code className="rounded bg-background px-3 py-1.5 text-sm font-mono">
                npx skills add pablostanley/designteam-app
              </code>
              <CopyButton text="npx skills add pablostanley/designteam-app" />
            </div>
          </div>
        </div>
      </main>

      <AgentDetailSheet
        agent={detailAgentId ? team.agents?.find((a) => a.id === detailAgentId) ?? null : null}
        state={detailAgentId ? states[detailAgentId] ?? null : null}
        open={!!detailAgentId}
        onOpenChange={(open) => { if (!open) setDetailAgentId(null) }}
      />
    </div>
  )
}

/**
 * Return the fraction of XP the agent has accumulated inside its current
 * level band — 0 at the level threshold, 1 just before the next one.
 * Returns null (not 0) for max-level agents so the bar can be hidden.
 */
function xpProgressInLevel(xp: number, level: number): number | null {
  const current = LEVEL_THRESHOLDS[level - 1] ?? 0
  const next = LEVEL_THRESHOLDS[level]
  if (next === undefined) return null
  const span = next - current
  if (span <= 0) return null
  return Math.min(1, Math.max(0, (xp - current) / span))
}

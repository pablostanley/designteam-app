"use client"

import Image from "next/image"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { getAvatarSrc } from "@/components/agent-avatars"
import { AGENT_ROLE_DEFINITIONS } from "@/lib/agent-builder/role-definitions"
import type { Agent, AgentMemoryEntry, AgentRole, EmotionalState } from "@/lib/agent-builder/types"
import { PERSONALITY_AXES, EMOTION_KEYS, LEVEL_THRESHOLDS } from "@/lib/agent-builder/types"
import { getMood, getMoodEmoji } from "@designteam/core"

export interface AgentDetailState {
  agent_id: string
  role: string
  emotions: EmotionalState
  memories?: AgentMemoryEntry[]
  xp: number
  level: number
  tasks_completed: number
  tasks_approved: number
  last_active_at: string | null
}

interface AgentDetailSheetProps {
  agent: Agent | null
  state: AgentDetailState | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const MEMORY_TYPE_LABEL: Record<string, string> = {
  preference: "Preferences",
  correction: "Corrections",
  approval: "Approvals",
  goal: "Goals",
  context: "Context",
  fact: "Facts",
}

export function AgentDetailSheet({ agent, state, open, onOpenChange }: AgentDetailSheetProps) {
  if (!agent) return null
  const role = AGENT_ROLE_DEFINITIONS[agent.role as AgentRole] ?? null
  const mood = state ? getMood(state.emotions) : null
  const moodEmoji = mood ? getMoodEmoji(mood) : null
  const xpProgress = state ? xpProgressInLevel(state.xp, state.level) : null

  // Group memories by type so the panel isn't one undifferentiated list.
  // Ordered by salience inside each bucket so the strongest signal surfaces first.
  const memoriesByType: Record<string, AgentMemoryEntry[]> = {}
  for (const mem of state?.memories ?? []) {
    const bucket = memoriesByType[mem.type] ?? []
    bucket.push(mem)
    memoriesByType[mem.type] = bucket
  }
  for (const bucket of Object.values(memoriesByType)) {
    bucket.sort((a, b) => b.salience - a.salience)
  }
  const memoryBuckets = Object.keys(memoriesByType).sort()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[440px] sm:max-w-[440px] p-0 flex flex-col">
        <SheetHeader className="px-5 py-4 border-b">
          <div className="flex items-center gap-3">
            <div className="relative w-16 h-16 shrink-0">
              <Image
                src={getAvatarSrc(role?.avatarKey ?? "creative-director", agent.pixabotId)}
                alt={agent.name}
                width={64}
                height={64}
                className="object-contain"
                unoptimized
                style={{ imageRendering: 'pixelated' }}
              />
              {moodEmoji && (
                <span
                  className="absolute -bottom-1 -right-1 text-base"
                  title={`Mood: ${mood}`}
                >
                  {moodEmoji}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <SheetTitle className="text-base truncate">{agent.name}</SheetTitle>
              <SheetDescription className="text-xs">
                {role?.displayName ?? agent.role}
                {state && state.level > 1 && ` · Lv ${state.level}`}
                {state && ` · ${state.tasks_completed} task${state.tasks_completed === 1 ? "" : "s"}`}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-5 py-4 space-y-6">
            {!state ? (
              <p className="text-xs text-muted-foreground">
                This agent hasn&apos;t been used yet — once someone chats with them or runs a task,
                their mood, memories, and XP will show up here.
              </p>
            ) : (
              <>
                {/* Emotions */}
                <Section label="Emotional state" hint={mood ? `Current mood: ${mood}` : undefined}>
                  <div className="space-y-1.5">
                    {EMOTION_KEYS.map((key) => (
                      <EmotionBar key={key} name={key} value={state.emotions[key] ?? 0.5} />
                    ))}
                  </div>
                </Section>

                {/* XP + Level */}
                {xpProgress !== null && (
                  <Section
                    label="Experience"
                    hint={`${state.xp} XP · ${state.tasks_approved}/${state.tasks_completed} approved`}
                  >
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-foreground transition-[width] duration-500"
                        style={{ width: `${Math.round(xpProgress * 100)}%` }}
                      />
                    </div>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      Level {state.level} · {Math.round(xpProgress * 100)}% to level {state.level + 1}
                    </p>
                  </Section>
                )}

                {/* Memories */}
                {memoryBuckets.length > 0 && (
                  <Section label="Memories" hint={`${state.memories?.length ?? 0} entries`}>
                    <div className="space-y-4">
                      {memoryBuckets.map((type) => (
                        <div key={type} className="space-y-1.5">
                          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                            {MEMORY_TYPE_LABEL[type] ?? type}
                          </span>
                          <ul className="space-y-1">
                            {memoriesByType[type].map((mem) => (
                              <li
                                key={mem.id}
                                className="flex items-start gap-2 rounded-md bg-muted/40 px-2 py-1.5"
                              >
                                <SalienceDot salience={mem.salience} />
                                <p className="text-xs leading-snug flex-1 break-words">
                                  {mem.content}
                                </p>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}
              </>
            )}

            {/* Personality sliders — always available from the Agent object, independent of state */}
            {agent.personality?.sliders && (
              <Section label="Personality">
                <div className="space-y-1.5">
                  {PERSONALITY_AXES.map((axisMeta) => {
                    const value = agent.personality.sliders[axisMeta.key] ?? 0
                    return <PersonalityBar key={axisMeta.key} axis={axisMeta} value={value} />
                  })}
                </div>
              </Section>
            )}

            {/* Traits */}
            {agent.traits && agent.traits.length > 0 && (
              <Section label="Traits">
                <div className="flex flex-wrap gap-1">
                  {agent.traits.map((t) => (
                    <Badge key={t} variant="secondary" className="text-[10px]">
                      {t}
                    </Badge>
                  ))}
                </div>
              </Section>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

function Section({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider">{label}</span>
        {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

function EmotionBar({ name, value }: { name: string; value: number }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100)
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] w-20 text-muted-foreground capitalize">{name}</span>
      <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-foreground transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] w-6 text-right tabular-nums text-muted-foreground">{pct}</span>
    </div>
  )
}

function PersonalityBar({
  axis,
  value,
}: {
  axis: (typeof PERSONALITY_AXES)[number]
  value: number
}) {
  // Sliders are -5..+5. Center the value at 50%, offset proportionally.
  const clamped = Math.max(-5, Math.min(5, value))
  const pct = 50 + (clamped / 5) * 50
  return (
    <div className="space-y-0.5">
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] text-muted-foreground">{axis.leftLabel}</span>
        <span className="text-[10px] text-muted-foreground">{axis.rightLabel}</span>
      </div>
      <div className="relative h-1 rounded-full bg-muted overflow-hidden">
        <div className="absolute top-0 left-1/2 h-full w-px bg-border" aria-hidden />
        <div
          className="absolute top-0 h-full w-1 rounded-full bg-foreground -translate-x-1/2 transition-[left] duration-500"
          style={{ left: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function SalienceDot({ salience }: { salience: number }) {
  const tier =
    salience >= 0.7 ? "bg-foreground" : salience >= 0.4 ? "bg-muted-foreground" : "bg-muted-foreground/50"
  return <span className={`mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full ${tier}`} aria-hidden />
}

function xpProgressInLevel(xp: number, level: number): number | null {
  const current = LEVEL_THRESHOLDS[level - 1] ?? 0
  const next = LEVEL_THRESHOLDS[level]
  if (next === undefined) return null
  const span = next - current
  if (span <= 0) return null
  return Math.min(1, Math.max(0, (xp - current) / span))
}

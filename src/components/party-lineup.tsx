"use client"

import { useMemo } from "react"
import { Plus, Zap, ChevronUp, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AgentCard } from "@/components/agent-card"
import type { Agent } from "@/lib/agent-builder"
import { MAX_TEAM_SIZE, analyzeTeamTension } from "@/lib/agent-builder"

interface PartyLineupProps {
  agents: Agent[]
  selectedAgentId: string | null
  onSelectAgent: (id: string) => void
  onAgentNameChange: (id: string, name: string) => void
  onRecruit: () => void
  onMoveAgent?: (id: string, direction: "up" | "down") => void
}

export function PartyLineup({
  agents,
  selectedAgentId,
  onSelectAgent,
  onAgentNameChange,
  onRecruit,
  onMoveAgent,
}: PartyLineupProps) {
  const emptySlots = MAX_TEAM_SIZE - agents.length
  const tensions = useMemo(() => analyzeTeamTension(agents), [agents])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-center gap-6">
        {agents.map((agent, index) => (
          <div key={agent.id} className="group relative">
            <AgentCard
              agent={agent}
              isSelected={selectedAgentId === agent.id}
              onSelect={() => onSelectAgent(agent.id)}
              onNameChange={(name) => onAgentNameChange(agent.id, name)}
            />
            {onMoveAgent && agents.length > 1 && (
              <div className="absolute -top-1 right-0 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation()
                    onMoveAgent(agent.id, "up")
                  }}
                  disabled={index === 0}
                >
                  <ChevronUp className="h-3 w-3" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation()
                    onMoveAgent(agent.id, "down")
                  }}
                  disabled={index === agents.length - 1}
                >
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        ))}

        {emptySlots > 0 &&
          Array.from({ length: Math.min(emptySlots, 3) }).map((_, i) => (
            <Button
              key={`empty-${i}`}
              variant="outline"
              onClick={onRecruit}
              className="flex h-[380px] w-56 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-muted-foreground/20 text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground"
            >
              <Plus className="h-6 w-6" />
              <span className="text-sm font-medium">Recruit</span>
            </Button>
          ))}
      </div>

      {tensions.length > 0 && (
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Team Dynamics</h4>
          <div className="flex flex-col gap-1.5">
            {tensions.map((t, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <Zap className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                <span className="text-foreground">
                  {t.description} &mdash; {t.agentA} ({t.traitA}) vs {t.agentB} ({t.traitB})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

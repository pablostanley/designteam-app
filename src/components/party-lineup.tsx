"use client"

import { useMemo } from "react"
import { Plus, Zap } from "lucide-react"
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
}

export function PartyLineup({
  agents,
  selectedAgentId,
  onSelectAgent,
  onAgentNameChange,
  onRecruit,
}: PartyLineupProps) {
  const emptySlots = MAX_TEAM_SIZE - agents.length
  const tensions = useMemo(() => analyzeTeamTension(agents), [agents])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-center gap-4">
        {agents.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            isSelected={selectedAgentId === agent.id}
            onSelect={() => onSelectAgent(agent.id)}
            onNameChange={(name) => onAgentNameChange(agent.id, name)}
          />
        ))}

        {emptySlots > 0 &&
          Array.from({ length: Math.min(emptySlots, 3) }).map((_, i) => (
            <Button
              key={`empty-${i}`}
              variant="outline"
              onClick={onRecruit}
              className="flex h-56 w-44 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-muted-foreground/20 text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground"
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

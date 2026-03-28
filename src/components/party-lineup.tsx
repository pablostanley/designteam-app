"use client"

import { useMemo } from "react"
import { Plus, ChevronUp, ChevronDown } from "lucide-react"
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

        {emptySlots > 0 && (
          <Button
            variant="outline"
            onClick={onRecruit}
            className="flex h-[380px] w-56 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-muted-foreground/20 text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground"
          >
            <Plus className="h-6 w-6" />
            <span className="text-sm font-medium">Recruit</span>
          </Button>
        )}
      </div>

      {tensions.length > 0 && (
        <div className="mx-auto w-full max-w-prose">
          <div className="rounded-xl border border-border p-8">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Team Dynamics</p>
            <div className="flex flex-col gap-4 mt-4">
              {tensions.map((t, i) => (
                <p key={i} className="text-sm text-muted-foreground">
                  <span className="text-foreground">{t.agentA}</span> and <span className="text-foreground">{t.agentB}</span> — {t.description.toLowerCase()}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

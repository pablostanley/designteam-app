"use client"

import { Plus } from "lucide-react"
import { AgentCard } from "@/components/agent-card"
import type { Agent } from "@/lib/agent-builder"
import { MAX_TEAM_SIZE } from "@/lib/agent-builder"

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

  return (
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
          <button
            key={`empty-${i}`}
            type="button"
            onClick={onRecruit}
            className="flex h-56 w-44 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-muted-foreground/20 text-muted-foreground transition-colors hover:border-muted-foreground/40 hover:text-foreground"
          >
            <Plus className="h-6 w-6" />
            <span className="text-sm font-medium">Recruit</span>
          </button>
        ))}
    </div>
  )
}

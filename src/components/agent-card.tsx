"use client"

import { useState, useRef } from "react"
import Image from "next/image"
import { Pencil } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { getAvatarSrc } from "@/components/agent-avatars"
import type { Agent } from "@/lib/agent-builder"
import { AGENT_ROLE_DEFINITIONS, PERSONALITY_AXES } from "@/lib/agent-builder"

interface AgentCardProps {
  agent: Agent
  isSelected: boolean
  onSelect: () => void
  onNameChange: (name: string) => void
}

export function AgentCard({ agent, isSelected, onSelect, onNameChange }: AgentCardProps) {
  const meta = AGENT_ROLE_DEFINITIONS[agent.role]
  const avatarSrc = getAvatarSrc(meta.avatarKey)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(agent.name)
  const inputRef = useRef<HTMLInputElement>(null)

  function commitRename() {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== agent.name) {
      onNameChange(trimmed)
    } else {
      setDraft(agent.name)
    }
    setEditing(false)
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group relative flex w-44 flex-col items-center rounded-xl border-2 bg-card p-4 text-left transition-all hover:shadow-md ${
        isSelected
          ? "border-foreground shadow-md"
          : "border-transparent hover:border-muted-foreground/30"
      }`}
    >
      {/* Avatar */}
      <div className="relative mb-3 h-32 w-32">
        <Image
          src={avatarSrc}
          alt={agent.name}
          fill
          className="object-contain"
        />
      </div>

      {/* Name */}
      <div className="flex items-center gap-1">
        {editing ? (
          <input
            ref={inputRef}
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename()
              if (e.key === "Escape") { setDraft(agent.name); setEditing(false) }
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-24 border-b border-foreground bg-transparent text-center text-sm font-semibold outline-none"
          />
        ) : (
          <>
            <span className="text-sm font-semibold">{agent.name}</span>
            <Pencil
              className="h-3 w-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 cursor-pointer"
              onClick={(e) => { e.stopPropagation(); setDraft(agent.name); setEditing(true) }}
            />
          </>
        )}
      </div>

      {/* Role badge */}
      <Badge
        variant="secondary"
        className="mt-1.5 text-xs"
        style={{ backgroundColor: meta.color + "18", color: meta.color }}
      >
        {meta.displayName}
      </Badge>

      {/* Personality mini bars */}
      <div className="mt-3 flex w-full flex-col gap-1.5">
        {PERSONALITY_AXES.map((axis) => {
          const value = agent.personality.sliders[axis.key]
          // Map -5..+5 to 0..100%
          const pct = ((value + 5) / 10) * 100
          return (
            <div key={axis.key} className="flex items-center gap-1">
              <div className="h-1 w-full rounded-full bg-muted">
                <div className="relative h-full">
                  <div
                    className="absolute top-0 h-full rounded-full"
                    style={{
                      left: `${Math.min(pct, 50)}%`,
                      width: `${Math.abs(pct - 50)}%`,
                      backgroundColor: meta.color,
                    }}
                  />
                  {/* Center mark */}
                  <div className="absolute left-1/2 top-1/2 h-2 w-px -translate-x-1/2 -translate-y-1/2 bg-muted-foreground/30" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Trait pills */}
      {agent.traits.length > 0 && (
        <div className="mt-2 flex flex-wrap justify-center gap-1">
          {agent.traits.slice(0, 3).map((trait) => (
            <Badge
              key={trait}
              variant="secondary"
              className="text-[10px] px-1.5 py-0"
            >
              {trait}
            </Badge>
          ))}
          {agent.traits.length > 3 && (
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0"
            >
              +{agent.traits.length - 3}
            </Badge>
          )}
        </div>
      )}
    </button>
  )
}

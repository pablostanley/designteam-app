"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import { getAvatarSrc } from "@/components/agent-avatars"
import type { Team } from "@/lib/agent-builder"
import {
  TEAM_PRESETS,
  createTeamFromPreset,
  AGENT_ROLE_DEFINITIONS,
} from "@/lib/agent-builder"
import type { TeamPreset } from "@/lib/agent-builder/team-presets"

interface PresetPickerProps {
  onSelectPreset: (team: Team) => void
  onStartFromScratch: () => void
}

export function PresetPicker({ onSelectPreset, onStartFromScratch }: PresetPickerProps) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold">Choose Your Starting Team</h2>
        <p className="text-sm text-muted-foreground">
          Pick a preset or start from scratch.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TEAM_PRESETS.map((preset) => {
          const roleMetas = preset.roles.map((r) => AGENT_ROLE_DEFINITIONS[r])
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelectPreset(createTeamFromPreset(preset))}
              className="flex flex-col gap-3 rounded-xl border bg-card p-4 text-left transition-all hover:border-muted-foreground/40 hover:shadow-sm"
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl">{preset.emoji}</span>
                <div>
                  <div className="text-sm font-semibold">{preset.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {preset.description}
                  </div>
                </div>
              </div>

              {/* Role avatar previews */}
              <div className="flex -space-x-2">
                {roleMetas.map((meta) => (
                  <div
                    key={meta.role}
                    className="relative h-8 w-8 overflow-hidden rounded-full border-2 border-card bg-muted"
                  >
                    <Image
                      src={getAvatarSrc(meta.avatarKey)}
                      alt={meta.displayName}
                      fill
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            </button>
          )
        })}
      </div>

      <button
        type="button"
        onClick={onStartFromScratch}
        className="text-sm text-muted-foreground hover:text-foreground hover:underline"
      >
        Start from Scratch
      </button>
    </div>
  )
}

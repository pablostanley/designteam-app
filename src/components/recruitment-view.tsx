"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Shuffle } from "lucide-react"
import { getAvatarSrc } from "@/components/agent-avatars"
import type { AgentRole } from "@/lib/agent-builder"
import { AGENT_ROLE_LIST, randomPixabotId } from "@/lib/agent-builder"

interface RecruitmentViewProps {
  existingRoles: AgentRole[]
  onRecruit: (role: AgentRole, pixabotId: string) => void
}

export function RecruitmentView({ existingRoles, onRecruit }: RecruitmentViewProps) {
  // Generate a random pixabotId for each role on mount — this is the character you'll get
  const [previewIds, setPreviewIds] = useState<Record<string, string>>({})

  useEffect(() => {
    const ids: Record<string, string> = {}
    for (const meta of AGENT_ROLE_LIST) {
      ids[meta.role] = randomPixabotId()
    }
    setPreviewIds(ids)
  }, [])

  function handleShuffle(role: string) {
    setPreviewIds(prev => ({ ...prev, [role]: randomPixabotId() }))
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold">Recruit Agents</h2>
        <p className="text-sm text-muted-foreground">
          Add specialized agents to your team. Shuffle to find the right character.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {AGENT_ROLE_LIST.map((meta) => {
          const inTeam = existingRoles.includes(meta.role)
          const pixabotId = previewIds[meta.role]
          const avatarSrc = pixabotId
            ? getAvatarSrc(meta.avatarKey, pixabotId)
            : getAvatarSrc(meta.avatarKey)

          return (
            <div
              key={meta.role}
              className="flex flex-col items-center gap-3 rounded-xl border bg-card p-4"
            >
              <div className="relative h-24 w-24 group">
                <Image
                  src={avatarSrc}
                  alt={meta.displayName}
                  fill
                  unoptimized
                  className="object-contain"
                  style={{ imageRendering: 'pixelated' }}
                />
                {!inTeam && (
                  <button
                    type="button"
                    onClick={() => handleShuffle(meta.role)}
                    className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-muted border opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    aria-label={`Shuffle ${meta.displayName} character`}
                  >
                    <Shuffle className="h-3 w-3 text-muted-foreground" />
                  </button>
                )}
              </div>

              <div className="text-center">
                <div className="text-sm font-semibold">{meta.displayName}</div>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                  {meta.description}
                </p>
              </div>

              <Button
                size="sm"
                variant={inTeam ? "secondary" : "default"}
                disabled={inTeam}
                onClick={() => onRecruit(meta.role, pixabotId || '')}
                className="w-full"
              >
                {inTeam ? "In Team" : "Recruit"}
              </Button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

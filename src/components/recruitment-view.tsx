"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import { getAvatarSrc } from "@/components/agent-avatars"
import type { AgentRole } from "@/lib/agent-builder"
import { AGENT_ROLE_LIST } from "@/lib/agent-builder"

interface RecruitmentViewProps {
  existingRoles: AgentRole[]
  onRecruit: (role: AgentRole) => void
}

export function RecruitmentView({ existingRoles, onRecruit }: RecruitmentViewProps) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold">Recruit Agents</h2>
        <p className="text-sm text-muted-foreground">
          Add specialized agents to your team.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {AGENT_ROLE_LIST.map((meta) => {
          const inTeam = existingRoles.includes(meta.role)
          const avatarSrc = getAvatarSrc(meta.avatarKey)

          return (
            <div
              key={meta.role}
              className="flex flex-col items-center gap-3 rounded-xl border bg-card p-4"
            >
              <div className="relative h-24 w-24">
                <Image
                  src={avatarSrc}
                  alt={meta.displayName}
                  fill
                  className="object-contain"
                />
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
                onClick={() => onRecruit(meta.role)}
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

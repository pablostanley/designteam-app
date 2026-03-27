import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import {
  AGENT_ROLE_DEFINITIONS,
  AGENT_ROLE_LIST,
} from "@/lib/agent-builder/role-definitions"
import { PERSONALITY_AXES } from "@/lib/agent-builder/types"
import { getAvatarSrc } from "@/components/agent-avatars"

function formatSliderValue(value: number, leftLabel: string, rightLabel: string): string {
  if (value === 0) return "Neutral"
  const label = value < 0 ? leftLabel : rightLabel
  const abs = Math.abs(value)
  if (abs <= 2) return `Slightly ${label}`
  return `Very ${label}`
}

export default function RolesPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Agent Roles</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          {AGENT_ROLE_LIST.length} specialized roles, each with unique skills
          and a default personality.
        </p>
      </div>

      <div className="space-y-6">
        {AGENT_ROLE_LIST.map((role) => {
          const avatarSrc = getAvatarSrc(role.avatarKey)
          return (
            <Card key={role.role}>
              <CardHeader className="flex flex-row items-start gap-4">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-muted">
                  <Image
                    src={avatarSrc}
                    alt={role.displayName}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">
                      {role.displayName}
                    </CardTitle>
                    <Badge
                      variant="secondary"
                      style={{ backgroundColor: role.color + "20", color: role.color }}
                    >
                      {role.role}
                    </Badge>
                  </div>
                  <CardDescription>{role.description}</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Default Personality
                </p>
                <div className="grid gap-1 text-sm sm:grid-cols-2">
                  {PERSONALITY_AXES.map((axis) => {
                    const value = role.defaultPersonality.sliders[axis.key]
                    return (
                      <div
                        key={axis.key}
                        className="flex items-center justify-between rounded px-2 py-1 text-muted-foreground"
                      >
                        <span className="truncate">
                          {axis.leftLabel}/{axis.rightLabel}
                        </span>
                        <span className="ml-2 shrink-0 font-mono text-xs text-foreground">
                          {value > 0 ? "+" : ""}
                          {value}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

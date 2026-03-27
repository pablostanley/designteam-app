"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getAvatarSrc } from "@/components/agent-avatars"
import { AGENT_ROLE_DEFINITIONS } from "@/lib/agent-builder/role-definitions"
import { CopyButton } from "@/components/copy-button"
import { UserMenu } from "@/components/user-menu"
import type { Team, AgentRole } from "@/lib/agent-builder/types"
import { PERSONALITY_AXES } from "@/lib/agent-builder/types"

interface TeamRow {
  team_data: Team
  name: string
  agent_count: number
  short_id: string
}

export default function TeamPage() {
  const params = useParams()
  const id = params.id as string
  const [team, setTeam] = useState<Team | null>(null)
  const [dbName, setDbName] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [forking, setForking] = useState(false)

  useEffect(() => {
    fetch(`/api/teams/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error)
        } else {
          const row = data.team as TeamRow
          setTeam(row.team_data)
          setDbName(row.name)
        }
        setLoading(false)
      })
      .catch(() => {
        setError("Failed to load team")
        setLoading(false)
      })
  }, [id])

  async function handleFork() {
    setForking(true)
    try {
      const res = await fetch(`/api/teams/${id}/fork`, { method: "POST" })
      const data = await res.json()
      if (data.team) {
        // Fetch the full forked team
        const fullRes = await fetch(`/api/teams/${data.team.short_id}`)
        const fullData = await fullRes.json()
        if (fullData.team?.team_data) {
          try {
            localStorage.setItem(
              "designteam-current",
              JSON.stringify(fullData.team.team_data),
            )
          } catch {
            // Storage full or unavailable
          }
          window.location.href = "/build"
          return
        }
      }
      // Fallback: redirect to URL if provided
      if (data.url) {
        window.location.href = data.url
      }
    } finally {
      setForking(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="mx-auto max-w-4xl px-4 py-4">
            <div className="h-5 w-24 bg-muted rounded animate-pulse" />
          </div>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-8">
          <div className="h-8 w-64 bg-muted rounded animate-pulse mb-2" />
          <div className="h-4 w-24 bg-muted rounded animate-pulse mb-8" />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-48 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        </main>
      </div>
    )
  }

  if (error || !team) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Team not found</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-sm font-semibold">
            Design Team
          </Link>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleFork}
              disabled={forking}
            >
              {forking ? "Forking..." : "Fork this team"}
            </Button>
            <Link href="/build">
              <Button>Build your own</Button>
            </Link>
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-bold">{dbName || team.name}</h1>
        <p className="mt-1 text-muted-foreground">
          {team.agents?.length ?? 0} agents
        </p>

        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {team.agents?.map((agent) => {
            const role =
              AGENT_ROLE_DEFINITIONS[agent.role as AgentRole] ?? null
            return (
              <div key={agent.id} className="space-y-2 rounded-lg border p-4">
                <Image
                  src={getAvatarSrc(role?.avatarKey ?? "ducky")}
                  alt={agent.name}
                  width={80}
                  height={80}
                  className="mx-auto object-contain"
                />
                <h3 className="text-center font-semibold">{agent.name}</h3>
                <div className="flex justify-center">
                  <Badge
                    variant="outline"
                    style={role ? { borderColor: role.color } : undefined}
                  >
                    {role?.displayName ?? agent.role}
                  </Badge>
                </div>
                {agent.traits && agent.traits.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-1">
                    {agent.traits.map((t) => (
                      <Badge
                        key={t}
                        variant="secondary"
                        className="text-[10px]"
                      >
                        {t}
                      </Badge>
                    ))}
                  </div>
                )}
                {agent.personality?.sliders && (
                  <div className="flex flex-wrap justify-center gap-x-2 gap-y-0.5 pt-1">
                    {Object.entries(agent.personality.sliders).map(
                      ([axis, value]) => {
                        if (value === 0) return null
                        const axisMeta = PERSONALITY_AXES.find(
                          (a) => a.key === axis,
                        )
                        if (!axisMeta) return null
                        const label =
                          value < 0
                            ? axisMeta.leftLabel
                            : axisMeta.rightLabel
                        const intensity =
                          Math.abs(value) >= 3 ? "very" : "somewhat"
                        return (
                          <span
                            key={axis}
                            className="text-xs text-muted-foreground"
                          >
                            {intensity} {label.toLowerCase()}
                          </span>
                        )
                      },
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-8 space-y-3">
          <div className="rounded-lg border bg-muted/50 p-4">
            <p className="mb-2 text-sm font-medium">
              Install this team:
            </p>
            <div className="flex items-center gap-2">
              <code className="rounded bg-background px-3 py-1.5 text-sm font-mono">
                npx designteam install {id}
              </code>
              <CopyButton text={`npx designteam install ${id}`} />
            </div>
          </div>
          <div className="rounded-lg border bg-muted/50 p-4">
            <p className="mb-2 text-sm font-medium">
              Or install the full skill set:
            </p>
            <div className="flex items-center gap-2">
              <code className="rounded bg-background px-3 py-1.5 text-sm font-mono">
                npx skills add pablostanley/designteam-app
              </code>
              <CopyButton text="npx skills add pablostanley/designteam-app" />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

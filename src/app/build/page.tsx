"use client"

import { useState, useEffect, useRef, type ReactNode } from "react"
import Link from "next/link"
import { Pencil, Users, UserPlus, Sparkles, Wand2, Download, Share2, Undo2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PartyLineup } from "@/components/party-lineup"
import { PersonalityEditor } from "@/components/personality-editor"
import { RecruitmentView } from "@/components/recruitment-view"
import { PresetPicker } from "@/components/preset-picker"
import { AITeamBuilder } from "@/components/ai-team-builder"
import { TeamExport } from "@/components/team-export"
import { ShareView } from "@/components/share-view"
import { ThemeToggle } from "@/components/theme-toggle"
import { UserMenu } from "@/components/user-menu"
import { isInIframe, sendTeamToParent } from "@/lib/iframe-bridge"
import type { Agent, AgentRole, Team } from "@/lib/agent-builder"
import {
  createDefaultTeam,
  createDefaultAgent,
  AGENT_ROLE_DEFINITIONS,
  MAX_TEAM_SIZE,
} from "@/lib/agent-builder"

type NavView = "party" | "recruit" | "presets" | "ai-build" | "export" | "share"

const NAV_ITEMS: { id: NavView; label: string; icon: ReactNode }[] = [
  { id: "party", label: "Party", icon: <Users className="h-4 w-4" /> },
  { id: "recruit", label: "Recruit", icon: <UserPlus className="h-4 w-4" /> },
  { id: "presets", label: "Presets", icon: <Sparkles className="h-4 w-4" /> },
  { id: "ai-build", label: "AI Build", icon: <Wand2 className="h-4 w-4" /> },
  { id: "export", label: "Export", icon: <Download className="h-4 w-4" /> },
  { id: "share", label: "Share", icon: <Share2 className="h-4 w-4" /> },
]

function BuildPageSkeleton() {
  return (
    <div className="flex h-dvh bg-background">
      <div className="hidden md:block w-56 shrink-0 border-r bg-card p-4">
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-9 bg-muted rounded-md animate-pulse" />
          ))}
        </div>
      </div>
      <div className="flex-1 p-8">
        <div className="h-8 w-48 bg-muted rounded animate-pulse mb-4" />
        <div className="flex gap-4 flex-wrap">
          {[1, 2, 3].map((i) => (
            <div key={i} className="w-44 h-64 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  )
}

function loadTeam(): Team {
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem("designteam-current")
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed && typeof parsed === "object" && Array.isArray(parsed.agents) && typeof parsed.name === "string") {
          return parsed as Team
        }
      }
    } catch {
      // corrupted data, ignore
    }
  }
  return createDefaultTeam("My Team")
}

export default function BuildPage() {
  const [team, setTeam] = useState<Team>(loadTeam)
  const [view, setView] = useState<NavView>("party")
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingTeamName, setEditingTeamName] = useState(false)
  const [inIframe] = useState(() => isInIframe())
  const [lastDeleted, setLastDeleted] = useState<{ agent: Agent; index: number } | null>(null)
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("designteam-current", JSON.stringify(team))
    } catch {
      // Storage full or unavailable — silently fail
    }
  }, [team])

  // Auto-sync team to parent iframe (debounced)
  useEffect(() => {
    if (!inIframe || !team) return
    const timer = setTimeout(() => {
      sendTeamToParent(team)
    }, 1000)
    return () => clearTimeout(timer)
  }, [inIframe, team])

  const selectedAgent = team.agents.find((a) => a.id === selectedAgentId) ?? null

  function handleSelectAgent(id: string) {
    setSelectedAgentId(id)
    setSheetOpen(true)
  }

  function handleAgentNameChange(id: string, name: string) {
    setTeam((prev) => ({
      ...prev,
      agents: prev.agents.map((a) => (a.id === id ? { ...a, name } : a)),
      updatedAt: new Date().toISOString(),
    }))
  }

  function handleUpdateAgent(updated: Agent) {
    setTeam((prev) => ({
      ...prev,
      agents: prev.agents.map((a) => (a.id === updated.id ? updated : a)),
      updatedAt: new Date().toISOString(),
    }))
  }

  function handleRemoveAgent(id: string) {
    const removedIndex = team.agents.findIndex((a) => a.id === id)
    const removedAgent = team.agents[removedIndex]
    setTeam((prev) => ({
      ...prev,
      agents: prev.agents.filter((a) => a.id !== id),
      updatedAt: new Date().toISOString(),
    }))
    if (selectedAgentId === id) {
      setSelectedAgentId(null)
    }
    if (removedAgent) {
      if (undoTimer.current) clearTimeout(undoTimer.current)
      setLastDeleted({ agent: removedAgent, index: removedIndex })
      undoTimer.current = setTimeout(() => setLastDeleted(null), 5000)
    }
  }

  function handleUndoDelete() {
    if (!lastDeleted) return
    if (undoTimer.current) clearTimeout(undoTimer.current)
    const { agent, index } = lastDeleted
    setTeam((prev) => {
      const agents = [...prev.agents]
      agents.splice(Math.min(index, agents.length), 0, agent)
      return { ...prev, agents, updatedAt: new Date().toISOString() }
    })
    setLastDeleted(null)
  }

  function handleMoveAgent(id: string, direction: "up" | "down") {
    setTeam((prev) => {
      const agents = [...prev.agents]
      const idx = agents.findIndex((a) => a.id === id)
      if (idx === -1) return prev
      const newIdx = direction === "up" ? idx - 1 : idx + 1
      if (newIdx < 0 || newIdx >= agents.length) return prev
      ;[agents[idx], agents[newIdx]] = [agents[newIdx], agents[idx]]
      return { ...prev, agents, updatedAt: new Date().toISOString() }
    })
  }

  function handleRecruit(role: AgentRole) {
    if (team.agents.length >= MAX_TEAM_SIZE) return
    const meta = AGENT_ROLE_DEFINITIONS[role]
    const agent = createDefaultAgent(role, meta)
    setTeam((prev) => ({
      ...prev,
      agents: [...prev.agents, agent],
      updatedAt: new Date().toISOString(),
    }))
    // Switch to party view and select the new agent
    setView("party")
    setSelectedAgentId(agent.id)
    setSheetOpen(true)
  }

  function handleSelectPreset(presetTeam: Team) {
    setTeam(presetTeam)
    setView("party")
    setSelectedAgentId(null)
  }

  function handleTeamNameChange(name: string) {
    setTeam((prev) => ({ ...prev, name, updatedAt: new Date().toISOString() }))
    setEditingTeamName(false)
  }

  if (!mounted) return <BuildPageSkeleton />

  const filteredNavItems = NAV_ITEMS.filter((item) => !(inIframe && item.id === "share"))

  return (
    <div className="flex flex-col md:flex-row h-dvh">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 shrink-0 flex-col border-r bg-card">
        {!inIframe && (
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <Link
              href="/"
              className="text-sm font-semibold tracking-tight hover:text-muted-foreground"
            >
              Design Team
            </Link>
          </div>
        )}

        <nav className="flex flex-1 flex-col gap-1 p-3">
          {filteredNavItems.map((item) => (
            <Button
              key={item.id}
              variant={view === item.id ? "secondary" : "ghost"}
              onClick={() => setView(item.id)}
              className="w-full justify-start gap-2.5"
            >
              {item.icon}
              {item.label}
            </Button>
          ))}
        </nav>
      </aside>

      {/* Mobile top nav */}
      <div className="flex md:hidden border-b overflow-x-auto px-2 gap-1 py-2">
        {filteredNavItems.map((item) => (
          <Button
            key={item.id}
            variant={view === item.id ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setView(item.id)}
            className="shrink-0"
          >
            {item.icon}
            <span className="ml-1.5">{item.label}</span>
          </Button>
        ))}
      </div>

      {/* Center content */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Team header */}
        <header className="flex items-center gap-4 border-b px-6 py-3">
          <div className="flex items-center gap-2">
            {editingTeamName ? (
              <input
                autoFocus
                defaultValue={team.name}
                className="border-b border-foreground bg-transparent text-lg font-semibold outline-none"
                onBlur={(e) => handleTeamNameChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleTeamNameChange(e.currentTarget.value)
                  if (e.key === "Escape") setEditingTeamName(false)
                }}
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingTeamName(true)}
                className="flex items-center gap-1.5 hover:text-muted-foreground"
              >
                <h1 className="text-lg font-semibold">{team.name}</h1>
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
          <span className="text-sm text-muted-foreground">
            {team.agents.length}/{MAX_TEAM_SIZE} Agents
          </span>
          <div className="ml-auto flex items-center gap-3">
            <UserMenu />
            <ThemeToggle />
          </div>
        </header>

        {/* View content */}
        <div className="flex-1 overflow-y-auto p-6">
          {view === "party" && (
            <div className="flex flex-col items-center gap-8 pt-8">
              {team.agents.length === 0 ? (
                <div className="flex flex-col items-center gap-4 py-16 text-center">
                  <Users className="h-12 w-12 text-muted-foreground/40" />
                  <div>
                    <h2 className="text-lg font-semibold">No agents yet</h2>
                    <p className="text-sm text-muted-foreground">
                      Recruit agents or pick a preset to get started.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Button size="lg" onClick={() => setView("recruit")}>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Recruit Agents
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => setView("presets")}
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      Start from Preset
                    </Button>
                  </div>
                </div>
              ) : (
                <PartyLineup
                  agents={team.agents}
                  selectedAgentId={selectedAgentId}
                  onSelectAgent={handleSelectAgent}
                  onAgentNameChange={handleAgentNameChange}
                  onRecruit={() => setView("recruit")}
                  onMoveAgent={handleMoveAgent}
                />
              )}
            </div>
          )}

          {view === "recruit" && (
            <RecruitmentView
              existingRoles={team.agents.map((a) => a.role)}
              onRecruit={handleRecruit}
            />
          )}

          {view === "presets" && (
            <PresetPicker
              onSelectPreset={handleSelectPreset}
              onStartFromScratch={() => {
                setTeam(createDefaultTeam("My Team"))
                setView("party")
              }}
            />
          )}

          {view === "ai-build" && (
            <AITeamBuilder
              onTeamGenerated={(aiTeam) => {
                setTeam(aiTeam)
                setView("party")
                setSelectedAgentId(null)
              }}
            />
          )}

          {view === "export" && (
            <TeamExport
              team={team}
              onImportTeam={(imported) => {
                setTeam(imported)
                setView("party")
                setSelectedAgentId(null)
              }}
            />
          )}

          {view === "share" && <ShareView team={team} />}
        </div>
      </main>

      {/* Personality editor sheet */}
      <PersonalityEditor
        agent={selectedAgent}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onUpdate={handleUpdateAgent}
        onRemove={handleRemoveAgent}
      />

      {/* Undo delete banner */}
      {lastDeleted && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg border bg-background px-4 py-2 shadow-lg flex items-center gap-3">
          <span className="text-sm">
            <strong>{lastDeleted.agent.name}</strong> removed.
          </span>
          <Button variant="ghost" size="sm" onClick={handleUndoDelete}>
            <Undo2 className="mr-1.5 h-3.5 w-3.5" />
            Undo
          </Button>
        </div>
      )}

      {/* Iframe: "Use This Team" bar */}
      {inIframe && team.agents.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background p-3 flex items-center justify-between px-8">
          <span className="text-sm text-muted-foreground">
            {team.agents.length} agent{team.agents.length !== 1 ? "s" : ""} configured
          </span>
          <Button onClick={() => sendTeamToParent(team)}>
            Use This Team
          </Button>
        </div>
      )}
    </div>
  )
}

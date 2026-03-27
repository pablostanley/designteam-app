"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Pencil, Users, UserPlus, Sparkles, Wand2, Download, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PartyLineup } from "@/components/party-lineup"
import { PersonalityEditor } from "@/components/personality-editor"
import { RecruitmentView } from "@/components/recruitment-view"
import { PresetPicker } from "@/components/preset-picker"
import { AITeamBuilder } from "@/components/ai-team-builder"
import { TeamExport } from "@/components/team-export"
import { ShareView } from "@/components/share-view"
import type { Agent, AgentRole, Team } from "@/lib/agent-builder"
import {
  createDefaultTeam,
  createDefaultAgent,
  AGENT_ROLE_DEFINITIONS,
  MAX_TEAM_SIZE,
} from "@/lib/agent-builder"

type NavView = "party" | "recruit" | "presets" | "ai-build" | "export" | "share"

const NAV_ITEMS: { id: NavView; label: string; icon: React.ReactNode }[] = [
  { id: "party", label: "Party", icon: <Users className="h-4 w-4" /> },
  { id: "recruit", label: "Recruit", icon: <UserPlus className="h-4 w-4" /> },
  { id: "presets", label: "Presets", icon: <Sparkles className="h-4 w-4" /> },
  { id: "ai-build", label: "AI Build", icon: <Wand2 className="h-4 w-4" /> },
  { id: "export", label: "Export", icon: <Download className="h-4 w-4" /> },
  { id: "share", label: "Share", icon: <Share2 className="h-4 w-4" /> },
]

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

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem("designteam-current", JSON.stringify(team))
  }, [team])

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
    setTeam((prev) => ({
      ...prev,
      agents: prev.agents.filter((a) => a.id !== id),
      updatedAt: new Date().toISOString(),
    }))
    if (selectedAgentId === id) {
      setSelectedAgentId(null)
    }
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

  return (
    <div className="flex h-dvh">
      {/* Left sidebar */}
      <aside className="flex w-56 shrink-0 flex-col border-r bg-card">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <Link
            href="/"
            className="text-sm font-semibold tracking-tight hover:text-muted-foreground"
          >
            Design Team
          </Link>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-3">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setView(item.id)}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                view === item.id
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

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
                    <Button size="sm" onClick={() => setView("recruit")}>
                      <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                      Recruit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setView("presets")}
                    >
                      <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                      Presets
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

          {view === "export" && <TeamExport team={team} />}

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
    </div>
  )
}

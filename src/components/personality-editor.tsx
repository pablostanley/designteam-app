"use client"

import { useState } from "react"
import Image from "next/image"
import { Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { getAvatarSrc } from "@/components/agent-avatars"
import type { Agent, PersonalityAxis } from "@/lib/agent-builder"
import {
  AGENT_ROLE_DEFINITIONS,
  PERSONALITY_AXES,
  PERSONALITY_TRAITS,
} from "@/lib/agent-builder"

interface PersonalityEditorProps {
  agent: Agent | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (agent: Agent) => void
  onRemove: (id: string) => void
}

export function PersonalityEditor({
  agent,
  open,
  onOpenChange,
  onUpdate,
  onRemove,
}: PersonalityEditorProps) {
  const [editingName, setEditingName] = useState(false)

  if (!agent) return null

  const meta = AGENT_ROLE_DEFINITIONS[agent.role]
  const avatarSrc = getAvatarSrc(meta.avatarKey)

  function handleSliderChange(axis: PersonalityAxis, value: number[]) {
    if (!agent) return
    onUpdate({
      ...agent,
      personality: {
        ...agent.personality,
        sliders: {
          ...agent.personality.sliders,
          [axis]: value[0],
        },
      },
    })
  }

  function handleTraitToggle(trait: string) {
    if (!agent) return
    const traits = agent.traits.includes(trait)
      ? agent.traits.filter((t) => t !== trait)
      : [...agent.traits, trait]
    onUpdate({ ...agent, traits })
  }

  function handleNameChange(name: string) {
    if (!agent) return
    onUpdate({ ...agent, name })
    setEditingName(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0">
        <ScrollArea className="h-full">
          <div className="flex flex-col gap-6 p-6">
            <SheetHeader className="p-0">
              {/* Portrait */}
              <div className="relative mx-auto h-40 w-40">
                <Image
                  src={avatarSrc}
                  alt={agent.name}
                  fill
                  className="object-contain"
                />
              </div>

              {/* Name */}
              <div className="flex items-center justify-center gap-2 mt-2">
                {editingName ? (
                  <input
                    autoFocus
                    defaultValue={agent.name}
                    className="border-b border-foreground bg-transparent text-center text-lg font-semibold outline-none"
                    onBlur={(e) => handleNameChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleNameChange(e.currentTarget.value)
                      if (e.key === "Escape") setEditingName(false)
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditingName(true)}
                    className="flex items-center gap-1.5 hover:text-muted-foreground"
                  >
                    <SheetTitle className="text-lg">{agent.name}</SheetTitle>
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                )}
              </div>

              <SheetDescription className="text-center">
                {meta.description}
              </SheetDescription>
            </SheetHeader>

            {/* Bipolar Sliders */}
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-semibold">Personality</h3>
              {PERSONALITY_AXES.map((axis) => {
                const value = agent.personality.sliders[axis.key]
                return (
                  <div key={axis.key} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{axis.leftLabel}</span>
                      <span>{axis.rightLabel}</span>
                    </div>
                    <div className="relative">
                      {/* Center mark */}
                      <div className="absolute left-1/2 top-1/2 z-10 h-3 w-px -translate-x-1/2 -translate-y-1/2 bg-muted-foreground/40" />
                      <Slider
                        min={-5}
                        max={5}
                        step={1}
                        value={[value]}
                        onValueChange={(v) => {
                          const arr = Array.isArray(v) ? v : [v]
                          handleSliderChange(axis.key, arr)
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Trait Pills */}
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold">Traits</h3>
              <div className="flex flex-wrap gap-2">
                {PERSONALITY_TRAITS.map((trait) => {
                  const isActive = agent.traits.includes(trait)
                  return (
                    <button
                      key={trait}
                      type="button"
                      onClick={() => handleTraitToggle(trait)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                        isActive
                          ? "border-foreground bg-foreground text-background"
                          : "border-border bg-background text-muted-foreground hover:border-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {trait}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Custom Prompt */}
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold">Custom Instructions</h3>
              <Textarea
                placeholder="Add custom instructions for this agent..."
                value={agent.customPrompt}
                onChange={(e) =>
                  onUpdate({ ...agent, customPrompt: e.target.value })
                }
                rows={4}
              />
            </div>

            {/* Remove */}
            <Button
              variant="destructive"
              size="sm"
              className="mt-2"
              onClick={() => {
                onRemove(agent.id)
                onOpenChange(false)
              }}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Remove from Team
            </Button>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

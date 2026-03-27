"use client"

import { useState } from "react"
import { Wand2, Sparkles, AlertCircle } from "lucide-react"
import { useCompletion } from "@ai-sdk/react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { Team } from "@/lib/agent-builder"
import { parseAITeamResponse } from "@/lib/agent-builder/ai-team-builder"

const SUGGESTIONS = [
  "A SaaS landing page for a fintech startup",
  "Complete rebrand for a sustainable fashion brand",
  "Social media campaign for a product launch",
  "Mobile app onboarding flow for a health app",
  "Marketing site for an AI developer tool",
  "Pitch deck for a Series A fundraise",
]

interface AITeamBuilderProps {
  onTeamGenerated: (team: Team) => void
}

export function AITeamBuilder({ onTeamGenerated }: AITeamBuilderProps) {
  const [projectDesc, setProjectDesc] = useState("")
  const [fallbackMode, setFallbackMode] = useState(false)

  const { completion, isLoading, complete, error } = useCompletion({
    api: "/api/ai/build-team",
    streamProtocol: "text",
    onFinish: (_prompt, completion) => {
      const team = parseAITeamResponse(completion)
      if (team) {
        onTeamGenerated(team)
      }
    },
    onError: (err) => {
      // If 503 (no API key), switch to fallback
      if (err.message?.includes("503") || err.message?.includes("ANTHROPIC_API_KEY")) {
        setFallbackMode(true)
      }
    },
  })

  function handleSubmit() {
    if (!projectDesc.trim() || isLoading) return
    complete(projectDesc.trim())
  }

  function handleSuggestion(s: string) {
    if (isLoading) return
    setProjectDesc(s)
    complete(s)
  }

  // Try to parse streaming JSON for a live preview of agent count
  const streamingAgentCount = (() => {
    if (!completion) return 0
    try {
      const matches = completion.match(/"role"\s*:/g)
      return matches?.length ?? 0
    } catch {
      return 0
    }
  })()

  // Try to extract team name from streaming JSON
  const streamingTeamName = (() => {
    if (!completion) return null
    try {
      const match = completion.match(/"name"\s*:\s*"([^"]+)"/)
      return match?.[1] ?? null
    } catch {
      return null
    }
  })()

  // Fallback: show old copy-paste instructions
  if (fallbackMode) {
    return <FallbackBuilder onTeamGenerated={onTeamGenerated} />
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-8">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold">Build Your Team with AI</h2>
        <p className="text-sm text-muted-foreground">
          Describe your project and we&apos;ll assemble the right team with the right personalities.
        </p>
      </div>

      <div className="space-y-3">
        <Textarea
          placeholder="Describe your project... (e.g., 'A SaaS landing page for a fintech startup targeting millennials')"
          value={projectDesc}
          onChange={(e) => setProjectDesc(e.target.value)}
          rows={3}
          disabled={isLoading}
          className="resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              handleSubmit()
            }
          }}
        />

        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-wrap gap-1.5 min-w-0">
            {SUGGESTIONS.slice(0, 3).map((s) => (
              <Button
                key={s}
                variant="outline"
                size="sm"
                onClick={() => handleSuggestion(s)}
                disabled={isLoading}
                className="rounded-full text-xs truncate max-w-48 h-auto px-2.5 py-1"
              >
                {s}
              </Button>
            ))}
          </div>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !projectDesc.trim()}
            className="shrink-0"
          >
            {isLoading ? (
              <>
                <Sparkles className="mr-1.5 h-3.5 w-3.5 animate-pulse" />
                Building...
              </>
            ) : (
              <>
                <Wand2 className="mr-1.5 h-3.5 w-3.5" />
                Build Team
              </>
            )}
          </Button>
        </div>
      </div>

      {error && !fallbackMode && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p>{error.message || "Failed to generate team."}</p>
            <p className="mt-1 text-xs opacity-75">
              Make sure ANTHROPIC_API_KEY is set in your environment.
            </p>
          </div>
        </div>
      )}

      {isLoading && completion && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <div className="h-2 w-2 rounded-full bg-foreground animate-pulse" />
            <span className="text-muted-foreground">
              Assembling{streamingTeamName ? ` "${streamingTeamName}"` : " your team"}
              {streamingAgentCount > 0 && (
                <span>
                  {" "}&mdash; {streamingAgentCount} agent{streamingAgentCount !== 1 ? "s" : ""} so far
                </span>
              )}
            </span>
          </div>
          <div className="rounded-lg border bg-muted/50 p-4 max-h-64 overflow-y-auto">
            <pre className="text-xs whitespace-pre-wrap font-mono text-muted-foreground">
              {completion}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Fallback: copy-paste flow when no API key
// ---------------------------------------------------------------------------

import {
  generateTeamBuildPrompt,
  AI_BUILD_SUGGESTIONS,
} from "@/lib/agent-builder/ai-team-builder"
import { Copy, Check, ArrowRight } from "lucide-react"

function FallbackBuilder({ onTeamGenerated }: { onTeamGenerated: (team: Team) => void }) {
  const [step, setStep] = useState<"describe" | "prompt" | "paste">("describe")
  const [description, setDescription] = useState("")
  const [generatedPrompt, setGeneratedPrompt] = useState("")
  const [aiResponse, setAiResponse] = useState("")
  const [copied, setCopied] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)

  function handleGenerate() {
    if (!description.trim()) return
    setGeneratedPrompt(generateTeamBuildPrompt(description.trim()))
    setStep("prompt")
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(generatedPrompt)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  function handleLoadTeam() {
    setParseError(null)
    const team = parseAITeamResponse(aiResponse)
    if (!team) {
      setParseError("Could not parse the response. Make sure it's valid JSON matching the expected format.")
      return
    }
    onTeamGenerated(team)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-8">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold">AI Team Builder</h2>
        <p className="text-sm text-muted-foreground">
          No API key configured. Copy the prompt to your AI tool and paste the response back.
        </p>
      </div>

      {step === "describe" && (
        <div className="flex flex-col gap-4">
          <Textarea
            placeholder="Describe your project..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="resize-none"
          />
          <div className="flex flex-wrap gap-2">
            {AI_BUILD_SUGGESTIONS.map((s) => (
              <Button
                key={s}
                variant="outline"
                size="sm"
                onClick={() => setDescription(s)}
                className="rounded-full text-xs h-auto px-3 py-1"
              >
                {s}
              </Button>
            ))}
          </div>
          <div>
            <Button onClick={handleGenerate} disabled={!description.trim()}>
              <Wand2 className="mr-1.5 h-3.5 w-3.5" />
              Generate Prompt
            </Button>
          </div>
        </div>
      )}

      {step === "prompt" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Copy this prompt and paste it into your AI tool
            </p>
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? <><Check className="mr-1.5 h-3.5 w-3.5" />Copied</> : <><Copy className="mr-1.5 h-3.5 w-3.5" />Copy</>}
            </Button>
          </div>
          <div className="max-h-64 overflow-y-auto rounded-lg border bg-muted/50 p-4">
            <pre className="whitespace-pre-wrap text-xs text-muted-foreground">{generatedPrompt}</pre>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => setStep("paste")}>
              <ArrowRight className="mr-1.5 h-3.5 w-3.5" />
              I&apos;ve got the response
            </Button>
            <Button variant="outline" onClick={() => setStep("describe")}>Start Over</Button>
          </div>
        </div>
      )}

      {step === "paste" && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Paste the JSON response from your AI tool below.
          </p>
          <Textarea
            placeholder='Paste the AI JSON response here...'
            value={aiResponse}
            onChange={(e) => { setAiResponse(e.target.value); setParseError(null) }}
            rows={10}
            className="font-mono text-xs"
          />
          {parseError && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {parseError}
            </div>
          )}
          <div className="flex gap-3">
            <Button onClick={handleLoadTeam} disabled={!aiResponse.trim()}>Load Team</Button>
            <Button variant="outline" onClick={() => setStep("prompt")}>Back</Button>
            <Button variant="outline" onClick={() => setStep("describe")}>Start Over</Button>
          </div>
        </div>
      )}
    </div>
  )
}

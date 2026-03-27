"use client"

import { useState } from "react"
import { Wand2, Copy, Check, ArrowRight, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { Team } from "@/lib/agent-builder"
import {
  generateTeamBuildPrompt,
  parseAITeamResponse,
  AI_BUILD_SUGGESTIONS,
} from "@/lib/agent-builder/ai-team-builder"

interface AITeamBuilderProps {
  onTeamGenerated: (team: Team) => void
}

type Step = "describe" | "prompt" | "paste"

export function AITeamBuilder({ onTeamGenerated }: AITeamBuilderProps) {
  const [step, setStep] = useState<Step>("describe")
  const [description, setDescription] = useState("")
  const [generatedPrompt, setGeneratedPrompt] = useState("")
  const [aiResponse, setAiResponse] = useState("")
  const [copied, setCopied] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)

  function handleGenerate() {
    if (!description.trim()) return
    const prompt = generateTeamBuildPrompt(description.trim())
    setGeneratedPrompt(prompt)
    setStep("prompt")
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(generatedPrompt)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback: select the text
    }
  }

  function handleLoadTeam() {
    setParseError(null)
    const team = parseAITeamResponse(aiResponse)
    if (!team) {
      setParseError(
        "Could not parse the response. Make sure it's valid JSON matching the expected format."
      )
      return
    }
    onTeamGenerated(team)
  }

  function handleStartOver() {
    setStep("describe")
    setDescription("")
    setGeneratedPrompt("")
    setAiResponse("")
    setParseError(null)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold">AI Team Builder</h2>
        <p className="text-sm text-muted-foreground">
          Describe your project and let AI compose the perfect team.
        </p>
      </div>

      {/* Step 1: Describe */}
      {step === "describe" && (
        <div className="flex flex-col gap-4">
          <Textarea
            placeholder="Describe your project... e.g. 'A SaaS landing page for a fintech startup targeting millennials'"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="resize-none"
          />

          <div className="flex flex-wrap gap-2">
            {AI_BUILD_SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => setDescription(suggestion)}
                className="rounded-full border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-muted-foreground/40 hover:text-foreground"
              >
                {suggestion}
              </button>
            ))}
          </div>

          <div>
            <Button
              onClick={handleGenerate}
              disabled={!description.trim()}
            >
              <Wand2 className="mr-1.5 h-3.5 w-3.5" />
              Generate Prompt
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Copy prompt */}
      {step === "prompt" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Copy this prompt and paste it into your AI tool (Claude, ChatGPT, etc.)
            </p>
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? (
                <>
                  <Check className="mr-1.5 h-3.5 w-3.5" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                  Copy
                </>
              )}
            </Button>
          </div>

          <div className="max-h-64 overflow-y-auto rounded-lg border bg-muted/50 p-4">
            <pre className="whitespace-pre-wrap text-xs text-muted-foreground">
              {generatedPrompt}
            </pre>
          </div>

          <div className="flex gap-3">
            <Button onClick={() => setStep("paste")}>
              <ArrowRight className="mr-1.5 h-3.5 w-3.5" />
              I've got the response
            </Button>
            <Button variant="outline" onClick={handleStartOver}>
              Start Over
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Paste AI response */}
      {step === "paste" && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Paste the JSON response from your AI tool below.
          </p>

          <Textarea
            placeholder='Paste the AI JSON response here... { "name": "...", "agents": [...] }'
            value={aiResponse}
            onChange={(e) => {
              setAiResponse(e.target.value)
              setParseError(null)
            }}
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
            <Button
              onClick={handleLoadTeam}
              disabled={!aiResponse.trim()}
            >
              Load Team
            </Button>
            <Button variant="outline" onClick={() => setStep("prompt")}>
              Back to Prompt
            </Button>
            <Button variant="outline" onClick={handleStartOver}>
              Start Over
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

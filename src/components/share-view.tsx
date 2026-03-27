"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Share2, Check, Copy, ExternalLink } from "lucide-react"
import type { Team } from "@/lib/agent-builder/types"

interface ShareViewProps {
  team: Team
}

export function ShareView({ team }: ShareViewProps) {
  const [sharing, setSharing] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleShare() {
    if (team.agents.length === 0) {
      setError("Add at least one agent before sharing.")
      return
    }

    setSharing(true)
    setError(null)

    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: team.name,
          team_data: team,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? "Failed to share team")
        return
      }

      const url = `${window.location.origin}/team/${data.team.short_id}`
      setShareUrl(url)
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setSharing(false)
    }
  }

  async function handleCopy() {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 pt-8">
      <div className="text-center">
        <Share2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
        <h2 className="text-lg font-semibold">Share your team</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate a public link so anyone can view and fork your team
          configuration.
        </p>
      </div>

      {!shareUrl ? (
        <div className="flex flex-col items-center gap-3">
          <Button onClick={handleShare} disabled={sharing} size="lg">
            {sharing ? "Sharing..." : "Generate share link"}
          </Button>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>
      ) : (
        <div className="space-y-4 rounded-lg border p-4">
          <p className="text-sm font-medium">Share link</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded bg-muted px-3 py-2 text-sm">
              {shareUrl}
            </code>
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
            <a href={shareUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4" />
              </Button>
            </a>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShareUrl(null)
              setError(null)
            }}
          >
            Generate new link
          </Button>
        </div>
      )}
    </div>
  )
}

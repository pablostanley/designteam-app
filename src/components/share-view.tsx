"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Share2, Check, Copy, ExternalLink, Save } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { Team } from "@/lib/agent-builder/types"

interface ShareViewProps {
  team: Team
}

export function ShareView({ team }: ShareViewProps) {
  const [sharing, setSharing] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setIsLoggedIn(!!data.user))
  }, [])

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

  async function handleSave() {
    if (team.agents.length === 0) {
      setError("Add at least one agent before saving.")
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: team.name,
          team_data: team,
          is_public: false,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Failed to save team")
        return
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setSaving(false)
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

      {isLoggedIn && (
        <div className="flex flex-col items-center gap-2">
          <Button
            variant="outline"
            onClick={handleSave}
            disabled={saving || saved}
            size="lg"
          >
            {saved ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Saved to account
              </>
            ) : saving ? (
              "Saving..."
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save to account
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground">
            Private save. Only you can see it.
          </p>
        </div>
      )}

      <div className="border-t pt-6" />

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

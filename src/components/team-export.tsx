"use client"

import { useState } from "react"
import { Copy, Download, Check, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Team } from "@/lib/agent-builder"
import { teamToMarkdown } from "@/lib/agent-builder"

interface TeamExportProps {
  team: Team
  onImportTeam?: (team: Team) => void
}

export function TeamExport({ team, onImportTeam }: TeamExportProps) {
  const [copied, setCopied] = useState(false)
  const [importJson, setImportJson] = useState("")
  const [importError, setImportError] = useState<string | null>(null)

  const markdown = teamToMarkdown(team)
  const json = JSON.stringify(team, null, 2)

  async function handleCopy(content: string) {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleDownload(content: string, filename: string) {
    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImport() {
    setImportError(null)
    try {
      const parsed = JSON.parse(importJson)
      if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.agents) || typeof parsed.name !== "string") {
        setImportError("Invalid team JSON: must have 'name' (string) and 'agents' (array).")
        return
      }
      onImportTeam?.(parsed as Team)
      setImportJson("")
    } catch {
      setImportError("Invalid JSON. Please check the format and try again.")
    }
  }

  const teamSlug = team.name.toLowerCase().replace(/\s+/g, "-")

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold">Export / Import Team</h2>
        <p className="text-sm text-muted-foreground">
          Export your team configuration or import from JSON.
        </p>
      </div>

        <Tabs defaultValue="markdown" onValueChange={() => { setCopied(false); setImportError(null) }}>
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="markdown">Markdown</TabsTrigger>
              <TabsTrigger value="json">JSON</TabsTrigger>
              <TabsTrigger value="import">Import</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="markdown" className="mt-4">
            <ScrollArea className="h-80 rounded-lg border bg-muted/30 p-4">
              <pre className="whitespace-pre-wrap text-xs font-mono">
                {markdown}
              </pre>
            </ScrollArea>
            <div className="mt-3 flex gap-2">
              <Button
                variant="outline"
                onClick={() => handleCopy(markdown)}
              >
                {copied ? (
                  <Check className="mr-1.5 h-4 w-4" />
                ) : (
                  <Copy className="mr-1.5 h-4 w-4" />
                )}
                {copied ? "Copied" : "Copy"}
              </Button>
              <Button
                variant="outline"
                onClick={() => handleDownload(markdown, `${teamSlug}.md`)}
              >
                <Download className="mr-1.5 h-4 w-4" />
                Download
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="json" className="mt-4">
            <ScrollArea className="h-80 rounded-lg border bg-muted/30 p-4">
              <pre className="whitespace-pre-wrap text-xs font-mono">
                {json}
              </pre>
            </ScrollArea>
            <div className="mt-3 flex gap-2">
              <Button
                variant="outline"
                onClick={() => handleCopy(json)}
              >
                {copied ? (
                  <Check className="mr-1.5 h-4 w-4" />
                ) : (
                  <Copy className="mr-1.5 h-4 w-4" />
                )}
                {copied ? "Copied" : "Copy"}
              </Button>
              <Button
                variant="outline"
                onClick={() => handleDownload(json, `${teamSlug}.json`)}
              >
                <Download className="mr-1.5 h-4 w-4" />
                Download
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="import" className="mt-4">
            <textarea
              className="h-80 w-full rounded-lg border bg-muted/30 p-4 text-xs font-mono resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Paste team JSON here..."
              value={importJson}
              onChange={(e) => setImportJson(e.target.value)}
            />
            {importError && (
              <p className="mt-2 text-sm text-destructive">{importError}</p>
            )}
            <div className="mt-3">
              <Button
                onClick={handleImport}
                disabled={!importJson.trim() || !onImportTeam}
              >
                <Upload className="mr-1.5 h-4 w-4" />
                Load Team
              </Button>
            </div>
          </TabsContent>
        </Tabs>
    </div>
  )
}

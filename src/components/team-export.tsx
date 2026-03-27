"use client"

import { useState } from "react"
import { Copy, Download, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Team } from "@/lib/agent-builder"
import { teamToMarkdown } from "@/lib/agent-builder"

interface TeamExportProps {
  team: Team
}

export function TeamExport({ team }: TeamExportProps) {
  const [copied, setCopied] = useState(false)

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

  const teamSlug = team.name.toLowerCase().replace(/\s+/g, "-")

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold">Export Team</h2>
        <p className="text-sm text-muted-foreground">
          Export your team configuration as markdown or JSON.
        </p>
      </div>

      {team.agents.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Add agents to your team before exporting.
        </p>
      ) : (
        <Tabs defaultValue="markdown">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="markdown">Markdown</TabsTrigger>
              <TabsTrigger value="json">JSON</TabsTrigger>
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
                size="sm"
                variant="outline"
                onClick={() => handleCopy(markdown)}
              >
                {copied ? (
                  <Check className="mr-1.5 h-3.5 w-3.5" />
                ) : (
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                )}
                {copied ? "Copied" : "Copy"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDownload(markdown, `${teamSlug}.md`)}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
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
                size="sm"
                variant="outline"
                onClick={() => handleCopy(json)}
              >
                {copied ? (
                  <Check className="mr-1.5 h-3.5 w-3.5" />
                ) : (
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                )}
                {copied ? "Copied" : "Copy"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDownload(json, `${teamSlug}.json`)}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Download
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

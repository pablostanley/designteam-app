"use client"

import { useState } from "react"
import { Check, Copy } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"

export function CopyBlock({ code, language = "" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="relative group">
      <pre className="overflow-x-auto rounded-lg border bg-muted px-4 py-3 text-sm">
        <code>{code}</code>
      </pre>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          navigator.clipboard.writeText(code)
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        }}
        className="absolute top-2 right-2 h-7 w-7 p-0 opacity-0 transition-opacity group-hover:opacity-100"
        aria-label="Copy to clipboard"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </Button>
    </div>
  )
}

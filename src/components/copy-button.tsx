"use client"

import { useState } from "react"
import { Check, Copy } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className="h-8 w-8 p-0 shrink-0"
      aria-label="Copy to clipboard"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </Button>
  )
}

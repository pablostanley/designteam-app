import Link from "next/link"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"

const SECTIONS = [
  {
    href: "/docs/getting-started",
    title: "Getting Started",
    description:
      "Learn how to build your first AI design team, configure personalities, and export skill files.",
  },
  {
    href: "/docs/roles",
    title: "Agent Roles",
    description:
      "Browse all available roles — from Researcher to Creative Director — and what each one brings to your team.",
  },
  {
    href: "/docs/cli",
    title: "CLI Integration",
    description:
      "Install Design Team skills for Claude Code, Cursor, or Codex with a single command.",
  },
  {
    href: "/docs/export",
    title: "Export Formats",
    description:
      "Understand the Markdown and JSON export formats and how to use them with any AI tool.",
  },
]

export default function DocsIndex() {
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Documentation</h1>
      <p className="mt-2 text-lg text-muted-foreground">
        Everything you need to assemble, customize, and deploy your AI design
        team.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {SECTIONS.map((section) => (
          <Link key={section.href} href={section.href} className="group">
            <Card className="h-full transition-colors group-hover:border-foreground/20">
              <CardHeader>
                <CardTitle className="text-base">{section.title}</CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

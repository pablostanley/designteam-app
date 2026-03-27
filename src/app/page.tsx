import Image from "next/image"
import Link from "next/link"
import { AVATAR_MAP } from "@/components/agent-avatars"
import { CopyButton } from "@/components/copy-button"

const INSTALL_CMD = "npx skills add pablostanley/designteam-app"

const AVATARS = Object.entries(AVATAR_MAP).map(([key, src]) => ({ key, src }))

const FEATURES = [
  {
    title: "16 Agents",
    description:
      "Researcher, copywriter, graphic designer, UX designer, brand strategist, and more.",
  },
  {
    title: "7 Skills",
    description:
      "Web design, brand strategy, copywriting, social media, UX writing, graphic design, and a meta-skill that orchestrates them all.",
  },
  {
    title: "Works Everywhere",
    description:
      "Claude Code, Cursor, Codex, Windsurf, and any tool that supports skills.sh.",
  },
]

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Design Team
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/docs"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Docs
          </Link>
          <a
            href="https://github.com/pablostanley/designteam-app"
            className="text-sm text-muted-foreground hover:text-foreground"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </div>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center px-6 py-24 text-center">
        <h1 className="max-w-xl text-4xl font-bold tracking-tight sm:text-5xl">
          Your AI Design Crew
        </h1>
        <p className="mt-4 max-w-lg text-lg text-muted-foreground">
          Install one skill. Get 16 specialized design agents.
        </p>

        {/* Install command */}
        <div className="mt-8 flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-4 py-3">
          <code className="font-mono text-sm">{INSTALL_CMD}</code>
          <CopyButton text={INSTALL_CMD} />
        </div>

        <p className="mt-4 text-sm text-muted-foreground">
          or{" "}
          <Link href="/build" className="underline hover:text-foreground">
            build your team manually
          </Link>
        </p>

        {/* What you get */}
        <div className="mt-20 grid w-full max-w-3xl gap-8 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="text-left">
              <h3 className="text-sm font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {f.description}
              </p>
            </div>
          ))}
        </div>

        {/* Agent roster */}
        <div className="mt-20 flex flex-wrap items-end justify-center gap-3">
          {AVATARS.map((avatar) => (
            <div
              key={avatar.key}
              className="relative h-14 w-14 overflow-hidden rounded-full bg-muted"
            >
              <Image
                src={avatar.src}
                alt={avatar.key}
                fill
                className="object-cover"
              />
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="flex items-center justify-center gap-4 px-6 py-6 text-sm text-muted-foreground">
        <span>
          Made by{" "}
          <a
            href="https://efecto.app"
            className="font-medium text-foreground hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Efecto
          </a>
        </span>
        <span>&middot;</span>
        <a
          href="https://github.com/pablostanley/designteam-app"
          className="hover:text-foreground"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </a>
        <span>&middot;</span>
        <Link href="/docs" className="hover:text-foreground">
          Docs
        </Link>
      </footer>
    </div>
  )
}

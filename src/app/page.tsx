"use client"

import Image from "next/image"
import Link from "next/link"
import { getAvatarSrc } from "@/components/agent-avatars"
import { CopyButton } from "@/components/copy-button"
import { UserMenu } from "@/components/user-menu"

const INSTALL_CMD = "npx skills add pablostanley/designteam-app"

// Stable pixabots for the hero — consistent across SSR + client, no wasted fetches
const HERO_PIXABOTS = [
  { key: 'nova', src: getAvatarSrc('creative-director') },
  { key: 'pixel', src: getAvatarSrc('graphic-designer') },
  { key: 'aria', src: getAvatarSrc('copywriter') },
  { key: 'scout', src: getAvatarSrc('researcher') },
  { key: 'flow', src: getAvatarSrc('ux-designer') },
]

export default function Home() {
  const avatars = HERO_PIXABOTS

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
          <UserMenu />
        </div>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 sm:py-24 text-center">
        {/* Agent pixabots */}
        <div className="flex items-end justify-center -space-x-4 mb-8">
          {avatars.map((avatar, i) => (
            <Image
              key={avatar.key}
              src={avatar.src}
              alt=""
              width={140}
              height={140}
              unoptimized
              className="h-[140px] w-auto object-contain drop-shadow-sm"
              style={{ zIndex: avatars.length - i, imageRendering: 'pixelated' }}
              priority
            />
          ))}
        </div>

        <h1 className="max-w-xl text-4xl font-bold tracking-tight sm:text-5xl">
          Your AI Design Crew
        </h1>
        <p className="mt-4 max-w-md text-lg text-muted-foreground">
          16 specialized agents. One install. They research, write, design, and
          ship.
        </p>

        {/* One install command */}
        <div className="mt-8 flex items-center gap-2 rounded-lg border bg-muted/50 px-4 py-3">
          <code className="font-mono text-sm">{INSTALL_CMD}</code>
          <CopyButton text={INSTALL_CMD} />
        </div>

        <p className="mt-3 text-sm text-muted-foreground">
          or{" "}
          <Link href="/build" className="underline hover:text-foreground">
            build your team visually
          </Link>
          {" "}&middot;{" "}
          <Link href="/docs" className="underline hover:text-foreground">
            read the docs
          </Link>
        </p>
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

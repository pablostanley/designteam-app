"use client"

import Image from "next/image"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"

const AVATARS = [
  { key: "detective", src: "/images/robots/detective.png" },
  { key: "musician", src: "/images/robots/musician.png" },
  { key: "skater", src: "/images/robots/skater.png" },
  { key: "doctor", src: "/images/robots/doctor.png" },
  { key: "ducky", src: "/images/robots/ducky.png" },
  { key: "umbrella", src: "/images/robots/umbrella.png" },
  { key: "surfer", src: "/images/robots/surfer.png" },
  { key: "chef", src: "/images/robots/chef.png" },
]

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Design Team
        </Link>
        <Link href="/build" className={buttonVariants({ size: "sm" })}>
          Get Started
        </Link>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <h1 className="max-w-xl text-4xl font-bold tracking-tight sm:text-5xl">
          Assemble your AI design crew
        </h1>
        <p className="mt-4 max-w-lg text-lg text-muted-foreground">
          Build a team of specialized AI agents, each with their own personality
          and expertise. Export as skill files for Claude Code, v0, or any AI tool.
        </p>

        <Link
          href="/build"
          className={buttonVariants({ size: "lg", className: "mt-8 h-11 px-6 text-base" })}
        >
          Build Your Team
        </Link>

        {/* Avatar row */}
        <div className="mt-16 flex items-end gap-3">
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
      <footer className="flex items-center justify-center px-6 py-6 text-sm text-muted-foreground">
        Made by{" "}
        <a
          href="https://efecto.app"
          className="ml-1 font-medium text-foreground hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          Efecto
        </a>
      </footer>
    </div>
  )
}

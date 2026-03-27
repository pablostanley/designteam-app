import Link from "next/link"

const NAV_ITEMS = [
  { href: "/docs", label: "Overview" },
  { href: "/docs/getting-started", label: "Getting Started" },
  { href: "/docs/roles", label: "Agent Roles" },
  { href: "/docs/cli", label: "CLI Integration" },
  { href: "/docs/export", label: "Export Formats" },
]

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            Design Team
          </Link>
          <span className="text-muted-foreground">/</span>
          <Link
            href="/docs"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Docs
          </Link>
        </div>
        <Link
          href="/build"
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Build a Team
        </Link>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <nav className="hidden w-56 shrink-0 border-r px-4 py-6 md:block">
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto px-8 py-8 md:px-12 lg:px-16">
          <div className="mx-auto max-w-3xl">{children}</div>
        </main>
      </div>
    </div>
  )
}

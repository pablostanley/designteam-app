# Dashboard / Admin UI Design

You're designing a dashboard — dense, functional, information-first.

## Core Principles

- **Legibility over beauty.** Dashboards are USED, not admired. text-sm and text-xs are your friends.
- **Information density.** Pack data efficiently. Users scan dashboards, they don't scroll through hero sections.
- **Consistent grid.** Cards, tables, and metrics should align to a tight grid.
- **Neutral base + accent for signals.** Gray/slate for chrome, color ONLY for status and alerts.

## Structure

- **Sidebar nav** (w-60 to w-64): Logo top, nav items, user avatar bottom. bg-zinc-950 or bg-slate-50.
- **Top bar** (h-14 to h-16): Breadcrumbs, search, notifications, user menu.
- **Content area**: Cards with metrics, tables, charts (represented as placeholder frames).
- **Metrics cards**: Number (text-3xl font-bold) + label (text-xs text-muted-foreground) + trend indicator.

## Color System

- **Green** (emerald-500): Success, growth, positive metrics
- **Red** (rose-500): Errors, decline, negative metrics
- **Amber** (amber-500): Warnings, pending states
- **Blue** (blue-500): Info, links, neutral highlights
- Everything else: Neutral (slate, zinc, gray)

## Layout

- Sidebar + content split. Content area gets the remaining width.
- Metric cards: 4-column grid at top. Each card: bg-card, p-5, rounded-xl, border.
- Tables: Full-width, striped or hover-highlighted rows. text-sm throughout.
- Use gap-4 to gap-6 between cards. Tighter than marketing pages.

# Design Team — Vision & Plan

**designteam.app** — Your AI design crew that ships.

## The One-Liner

Install one skill, get a full design team that designs AND ships. Not just pretty pictures. Research, strategy, copy, design, code, review, deploy.

## How It Works

```bash
npx skills add pablostanley/designteam-app
```

Claude Code becomes your Creative Director. You say "design a landing page for FocusFlow" and it:

1. **Researches** — analyzes competitors, identifies positioning gaps
2. **Strategizes** — defines brand direction, messaging framework
3. **Writes** — headlines using PAS/AIDA, benefit-driven CTAs
4. **Designs** — in Efecto (design phase) or code (shipping phase)
5. **Reviews** — visual QA, accessibility audit, copy check
6. **Ships** — responsive components, tested, deployed

Each phase activates specialist knowledge. Not generic advice — real frameworks with specific deliverables.

## Architecture: Skills + Contexts

**Skills are ROLES** — who does what, how they think, what they produce.
**Contexts are DOMAINS** — specific design patterns for landing pages, dashboards, social, etc.

When you design a landing page, the Creative Director:
- Loads `landing-page` context (structure, patterns, rules)
- Activates the right skills in sequence (researcher → copywriter → visual designer → design engineer)
- Each skill draws from its expertise AND the context patterns

### 16 Skills (roles)

**Research & Strategy:**
1. **researcher** (Scout) — competitive analysis, audience profiling, positioning gaps
2. **brand-strategist** (Sage) — brand identity, visual systems, voice/tone, guidelines
3. **content-strategist** (Story) — content architecture, editorial calendars, taxonomy
4. **marketing-strategist** (Maven) — campaign planning, channel strategy, audience targeting
5. **seo-specialist** (Signal) — on-page SEO, meta tags, structured data, keyword strategy

**Creative:**
6. **creative-director** (Nova) — orchestration, brief-setting, quality gates
7. **copywriter** (Aria) — headlines, messaging, CTAs, voice

**Design:**
8. **graphic-designer** (Pixel) — color, typography, composition, imagery, visual systems
9. **ux-designer** (Flow) — user flows, information architecture, interaction patterns
10. **editorial-designer** (Reed) — grid systems, spacing, reading rhythm, hierarchy
11. **motion-designer** (Flux) — animation, transitions, micro-interactions
12. **print-designer** (Ink) — physical media, CMYK, packaging
13. **social-media-designer** (Buzz) — platform-specific content, formats, trends
14. **ux-writer** (Quill) — button labels, errors, empty states, tooltips

**Ship:**
15. **design-engineer** (Kit) — components, responsive, tokens, CSS/React
16. **accessibility-specialist** (Atlas) — WCAG audits, assistive tech, universal design

### 17 Design Contexts (domains)

**Web/App:** landing-page, marketing-site, dashboard, mobile-app, ecommerce, portfolio, ux-flow
**Print/Physical:** business-card, flyer, invitation, presentation, resume, document, menu
**Social/Content:** social-media, newsletter, infographic

### How Skills and Contexts Interact

```
User: "Design a landing page for my SaaS"
  → Creative Director identifies: LANDING PAGE context
  → Loads: landing-page patterns (hero, social proof, features, CTA)
  → Runs workflow:
     1. researcher → competitive analysis
     2. brand-strategist → positioning + messaging framework
     3. copywriter → headlines using PAS framework + landing page rules
     4. graphic-designer → color palette, hero section
     5. editorial-designer → grid, spacing, responsive
     6. ux-writer → button labels, form text
     7. design-engineer → React components, Tailwind
     8. accessibility-specialist → WCAG check, responsive test, production verify
```

## Design vs Ship Mode

Skills have a **mode bias**:

**Design mode** (ideation, exploration): Use Efecto MCP tools to create artboards, iterate visually, explore options. The visual designers, creative director, and strategist work here.

**Ship mode** (implementation, production): Write code directly — React components, Tailwind CSS, semantic HTML. The design engineer, QA lead, and microcopy specialist work here.

The Creative Director decides the mode based on the user's intent:
- "Design a landing page" → starts in design mode (Efecto)
- "Build a landing page" → starts in ship mode (code)
- "Ship this design" → transitions from design to ship mode

## Writing & Voice Rules

From gstack learnings — the Design Team speaks naturally:

**DO:**
- Be direct. Lead with the point.
- Use specifics. "47% faster" not "much faster"
- Write at 8th grade level. Short sentences. Active voice.
- Show proof. Before/after. Numbers. Screenshots.
- Sound like a builder talking to a builder.

**DON'T:**
- Em-dashes. Ever.
- "Delve", "unlock", "leverage", "synergy", "empower"
- "Beautiful", "stunning", "gorgeous" (show, don't tell)
- Generic SaaS speak ("Transform your workflow")
- Consultant throat-clearing ("It's worth noting that...")
- Exclamation marks (except celebrating wins)

## Quality Standards (from gstack)

**AI Slop Detection** — flag instantly:
- Generic SaaS card grids as first impression
- Beautiful image + weak brand juxtaposition
- Purple/violet gradients and decorative blobs
- Centered-everything layout
- 3-column feature grids with icon circles
- Cookie-cutter section rhythm

**Design Completeness Rating (0-10):**
1. Information architecture
2. Interaction states (loading, empty, error, success)
3. User journey and emotional arc
4. AI slop risk
5. Design system alignment
6. Responsive and accessibility
7. Unresolved decisions

**Fix-First Philosophy:**
- Auto-fix obvious issues (spacing, colors, radius, typos)
- Batch complex decisions into one question
- Never leave findings unfixed
- Every finding needs before/after evidence

## What's Built

### Web App (designteam.app)
- [x] Homepage with skills.sh install CTA
- [x] Full-page team builder (/build)
- [x] 16 agent roles with personality sliders
- [x] Bipolar sliders (-5 to +5, center = neutral)
- [x] 32 personality traits across 4 categories (temperament, work style, social, mindset)
- [x] Custom prompt per agent
- [x] 7 team presets
- [x] AI team generation
- [x] Export as Markdown (with generated skill files) / JSON
- [x] AI team builder with Claude streaming
- [x] Personality v2 (32 categorized traits, team tension dynamics)
- [x] gstack learnings (writing rules, slop detection)
- [x] llms.txt
- [x] Documentation (/docs)
- [x] 63 unit tests

### CLI Skills (skills.sh)
- [x] 17 installable skills (16 role-based + 1 orchestrator)
- [x] 6 Claude Code agents (creative-director, copywriter, design-reviewer, qa-lead, design-engineer, researcher)
- [x] 6 slash commands (/design-audit, /brand-review, /copy-review, /a11y-check, /ship, /design-slop-check)
- [x] 4 rule files (design-standards, accessibility, writing-style, ai-slop-detection)

### Supabase (team storage + sharing)
- [x] Supabase project (Pro org, us-east-1)
- [x] teams table (short_id, team_data JSONB, user_id, is_public, fork_count)
- [x] profiles table (display_name, avatar_url)
- [x] RLS policies (public read, owner write, anyone can create)
- [x] API routes (GET/POST /api/teams, GET/PUT/DELETE /api/teams/[id], POST /api/teams/[id]/fork)
- [x] Team sharing page (/team/[id])
- [x] Share button in builder
- [x] Vercel env vars configured

### Efecto Integration
- [x] Team builder embeds designteam.app via iframe
- [x] AI pipeline (server-side agent routing, personality-modulated prompts)

## What's Next

### Phase 1: Polish + Test (current)
- [ ] Auth flow (GitHub OAuth, magic link)
- [ ] "My Teams" dashboard for logged-in users
- [ ] CLI `--team abc123` flag support
- [ ] OpenAPI spec for /api/teams
- [ ] More robot avatars (16 roles sharing 9 images)

### Phase 2: Efecto Deep Integration
- [x] postMessage bridge: designteam.app iframe → Efecto parent
- [x] Team config flows from designteam.app → Efecto AI pipeline
- [ ] Design mode uses Efecto MCP tools automatically
- [ ] Ship mode outputs code directly

### Phase 3: Ecosystem
- [ ] npm package (@designteam/core) for programmatic access
- [ ] Plugin for Cursor, Windsurf, Codex
- [ ] Webhook: team config changes → triggers in connected tools

## Tech Stack
- Next.js 16, React 19, Tailwind CSS 4, shadcn/ui
- Supabase (auth, database, RLS) — Pro org
- Geist fonts, oklch neutral color system
- Vercel deployment
- skills.sh compatible

## Infrastructure
- **Supabase project:** vunmdnoervxpcvgiaamz (org: dwokmbqfzmfevmjhfexd)
- **Supabase URL:** https://vunmdnoervxpcvgiaamz.supabase.co
- **Vercel project:** designteam (connected to designteam.app)

## Links
- **App:** https://designteam.app
- **Repo:** https://github.com/pablostanley/designteam-app
- **Install:** `npx skills add pablostanley/designteam-app`
- **Supabase:** https://supabase.com/dashboard/project/vunmdnoervxpcvgiaamz
- **Efecto PR:** https://github.com/pablostanley/efecto-app/pull/495

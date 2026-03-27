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

### 13 Skills (roles)

**Research & Strategy:**
1. **Researcher** (Scout) — competitive analysis, audience profiling, positioning gaps
2. **Strategist** (Sage) — brand positioning, content model, campaign strategy

**Creative:**
3. **Creative Director** (Nova) — orchestration, brief-setting, quality gates
4. **Copywriter** (Aria) — headlines, messaging, CTAs, voice

**Design:**
5. **Visual Designer** (Pixel) — color, typography, composition, imagery, visual systems
6. **UX Designer** (Flow) — user flows, information architecture, interaction patterns
7. **Layout Designer** (Reed) — grid systems, spacing, reading rhythm, hierarchy
8. **Motion Designer** (Flux) — animation, transitions, micro-interactions
9. **Print Designer** (Ink) — physical media, CMYK, packaging
10. **Social Designer** (Buzz) — platform-specific content, formats, trends
11. **Microcopy Specialist** (Quill) — button labels, errors, empty states, tooltips

**Ship:**
12. **Design Engineer** (Kit) — components, responsive, tokens, CSS/React
13. **QA Lead** (Atlas) — accessibility audit, code-matches-design, production check

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
     1. Researcher → competitive analysis
     2. Strategist → positioning + messaging framework
     3. Copywriter → headlines using PAS framework + landing page rules
     4. Visual Designer → color palette, hero section
     5. Layout Designer → grid, spacing, responsive
     6. Microcopy Specialist → button labels, form text
     7. Design Engineer → React components, Tailwind
     8. QA Lead → WCAG check, responsive test, production verify
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
- [x] 16 selectable personality traits
- [x] Custom prompt per agent
- [x] 7 team presets
- [x] AI team generation
- [x] Export as Markdown / JSON
- [x] Documentation (/docs)
- [x] 52 unit tests

### CLI Skills (skills.sh)
- [x] 7 orchestration skill files (design-team, web-design, graphic-design, social-media, brand-strategy, copywriting, ux-writing)
- [x] 4 Claude Code agents (design-lead, copywriter, design-reviewer, accessibility-checker)
- [x] 4 slash commands (/design-audit, /brand-review, /copy-review, /a11y-check)
- [x] 2 rule files (design-standards, accessibility)

### Efecto Integration
- [x] Team builder embeds designteam.app via iframe
- [x] AI pipeline (server-side agent routing, personality-modulated prompts)
- [x] Persistence (IndexedDB + Supabase sync)

## What's Next

### Phase 1: Skill Restructure (current)
- [ ] Expand 7 CLI skills → 13 (one per role)
- [ ] Each skill has deep frameworks, not generic descriptions
- [ ] Design contexts auto-referenced by relevant skills
- [ ] Add ship-focused skills (design engineer, QA lead)
- [ ] Writing rules baked into every skill (no slop)

### Phase 2: Workflow Enforcement
- [ ] Creative Director skill defines explicit phase gates
- [ ] Each phase produces a specific artifact before the next starts
- [ ] Design context auto-loaded based on project classification
- [ ] Feedback loops: engineer → designer when implementation reveals issues

### Phase 3: Efecto Deep Integration
- [ ] postMessage bridge: designteam.app iframe → Efecto parent
- [ ] Team config flows from designteam.app → Efecto AI pipeline
- [ ] Design mode uses Efecto MCP tools automatically
- [ ] Ship mode outputs code directly

### Phase 4: API & Ecosystem
- [ ] OpenAPI spec for team management
- [ ] Webhook: team config changes → triggers in connected tools
- [ ] npm package (@designteam/core) for programmatic access
- [ ] Plugin for Cursor, Windsurf, Codex

## Tech Stack
- Next.js 16, React 19, Tailwind CSS 4, shadcn/ui
- Geist fonts, oklch neutral color system
- localStorage (no database for now)
- Vercel deployment
- skills.sh compatible

## Links
- **App:** https://designteam.app
- **Repo:** https://github.com/pablostanley/designteam-app
- **Install:** `npx skills add pablostanley/designteam-app`
- **Efecto PR:** https://github.com/pablostanley/efecto-app/pull/495

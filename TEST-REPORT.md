# Design Team -- Test Report
2026-03-26

## Summary
16 tests run, 13 passed clean, 5 issues found (0 critical, 1 high, 2 medium, 2 low)

---

## Issues

### BUG-01: [HIGH] Homepage claims "7 Skills" but there are 18 skill directories
File: `src/app/page.tsx:17`
Expected: Feature card should say "18 Skills" (or however many are actually shipped)
Actual: Says "7 Skills" with description listing only 7 skill categories
Fix: Update the `FEATURES` array at line 17 to reflect the actual count. Either "18 Skills" listing all categories, or group them differently.

### BUG-02: [MEDIUM] Banned word "seamless" in UX Designer role description
File: `src/lib/agent-builder/role-definitions.ts:60`
Expected: No banned words per writing-style rules (`.claude/rules/writing-style.md` explicitly bans "seamless")
Actual: `'Designs intuitive interactions, user flows, and information architecture for seamless experiences.'`
Fix: Replace "seamless" with something specific, e.g., "intuitive experiences" or "frictionless experiences" (if "frictionless" is acceptable).

### BUG-03: [MEDIUM] Banned word "elevates" in Creative Director role description
File: `src/lib/agent-builder/role-definitions.ts:100`
Expected: No banned words (`.claude/rules/writing-style.md` bans "elevate")
Actual: `'Orchestrates the team vision, ensures brand coherence, and elevates the overall creative quality.'`
Fix: Replace "elevates" with something concrete, e.g., "raises" or "sharpens."

### BUG-04: [LOW] Shared `copied` state across Markdown/JSON export tabs
File: `src/components/team-export.tsx:16`
Expected: Copying markdown shows "Copied" only on the markdown tab's button
Actual: A single `copied` boolean is shared. If you copy markdown, switch to JSON tab, the JSON copy button also shows "Copied" briefly (until the 2s timeout). The `onValueChange` handler (line 53) does reset it on tab switch, which partially mitigates this, but the race condition exists if you switch tabs within the 2s window right after copying.
Fix: Track `copied` per tab (e.g., `copiedTab: 'markdown' | 'json' | null`) or just accept this as minor UX.

### BUG-05: [LOW] Duplicate avatar keys across roles
File: `src/lib/agent-builder/role-definitions.ts`
Expected: Each role should have a distinct visual identity
Actual: Multiple roles share the same avatarKey:
- `chef`: creative-director + brand-strategist
- `detective`: researcher + content-strategist
- `doctor`: ux-designer + accessibility-specialist
- `ducky`: ux-writer + seo-specialist
- `musician`: copywriter + motion-designer
- `surfer`: social-media-designer + marketing-strategist
- `umbrella`: editorial-designer + print-designer
Only `skater` and `skater2` are unique (graphic-designer and design-engineer).
Fix: Add more avatar images or differentiate via color overlays. With 16 roles and ~9 avatars, duplication is inevitable without more art. Low priority since the color badge differentiates them.

---

## Passing Tests

### Test 1: Unit Tests -- PASS
6 test files, 52 tests, all passing. Coverage includes personality engine, types, team export, AI team builder, skill generator, and team composition.

### Test 2: Build -- PASS
`pnpm build` compiles successfully with Next.js 16.2.1 (Turbopack). All 9 routes generated as static pages. No warnings or errors.

### Test 3: Skills Structure -- PASS (after background creation)
All 18 skill directories have valid `SKILL.md` files with `name:` and `description:` frontmatter. (Note: `marketing-strategist` and `seo-specialist` were being created in real-time during the test -- another agent may have been populating them.)

### Test 4: Type Safety -- PASS
`npx tsc --noEmit` completed with zero errors.

### Test 5: Homepage -- PASS (except BUG-01)
- Has skills.sh install command as primary CTA: YES (`npx skills add pablostanley/designteam-app`)
- Has "build your team" secondary CTA: YES (link to `/build`)
- Has docs link: YES (header + footer)
- Has robot avatars: YES (renders all avatars from AVATAR_MAP)
- Copy follows writing rules: YES (no em-dashes, no slop words in homepage copy)
- Issue: skill count is wrong (see BUG-01)

### Test 6: Team Builder Page -- PASS
- Left sidebar navigation: 5 views (Party, Recruit, Presets, AI Build, Export)
- localStorage persistence: YES (`designteam-current` key, saved on every `team` state change)
- Agents add/remove: YES (handleRecruit, handleRemoveAgent)
- Team name editable: YES (inline edit with Enter/Escape/blur handling)
- Agent names editable: YES (handleAgentNameChange)
- PersonalityEditor sheet opens on agent select: YES

### Test 7: Personality System -- PASS
- All sliders at 0: returns "You have a neutral, balanced communication style." (verified via test suite)
- Slider at -5: returns "very [left label]" (threshold: value <= -3)
- Slider at +5: returns "very [right label]" (threshold: value > 2)
- Traits included in fragment: YES ("Key traits: ...")
- Custom prompt included: YES ("Additional instructions: ...")
- Bipolar range -5 to +5 with 0 = neutral: YES (defined in types.ts)

### Test 8: AI Team Builder -- PASS
- Textarea for project description: YES
- "Generate Prompt" button: YES (disabled when empty)
- Copy-able prompt output: YES (step 2)
- "Paste AI Response" textarea: YES (step 3, monospace font)
- "Load Team" button: YES (with JSON parse error handling)
- Example suggestions shown: YES (AI_BUILD_SUGGESTIONS rendered as pills)

### Test 9: Export -- PASS (except BUG-04)
- Markdown tab with preview: YES
- JSON tab with preview: YES
- Copy to clipboard button: YES (per tab)
- Download button: YES (per tab, filename based on team slug)
- Content includes all agent info: YES (teamToMarkdown includes name, role, personality, traits, custom prompt)

### Test 10: Docs Pages -- PASS
All 5 doc pages exist and have content:
- `docs/page.tsx` (59 lines)
- `docs/getting-started/page.tsx` (181 lines)
- `docs/roles/page.tsx` (95 lines)
- `docs/cli/page.tsx` (117 lines)
- `docs/export/page.tsx` (205 lines)

### Test 11: Role Definitions Completeness -- PASS
All 16 roles in `AgentRole` type have corresponding entries in `AGENT_ROLE_DEFINITIONS`. Each has: displayName, description, avatarKey, defaultPersonality, baseSkillKeys, color.

### Test 12: Design Contexts -- PASS
17 design skill files found in `src/lib/agent-builder/design-skills/`. Matches expected count.

### Test 13: Agent Skills -- PASS
16 agent skill markdown files in `src/lib/agent-builder/skills/`. Matches the 16 roles.

### Test 14: Claude Code Integration -- PASS
- 6 agents: copywriter, creative-director, design-engineer, design-reviewer, qa-lead, researcher
- 6 commands: a11y-check, brand-review, copy-review, design-audit, design-slop-check, ship
- 4 rules: accessibility, ai-slop-detection, design-standards, writing-style
- All agent files have proper frontmatter (name, description, tools, model)

### Test 15: Writing Rules -- PASS (except BUG-02, BUG-03)
Grep results show banned words appear ONLY in:
- Rule/ban-list definitions (listing what NOT to use) -- acceptable
- Two role descriptions in `role-definitions.ts` -- BUG-02 and BUG-03

### Test 16: Efecto Integration -- PASS
- `agent-team-panel.tsx` exists and embeds `https://designteam.app/build` via iframe
- Efecto worktree builds successfully ("Compiled successfully", "182/182" static pages generated)

# Design Team App — Critical Audit Report

Audited: 2026-03-26
Auditor: Claude Code
Scope: Personality flow, data integrity, real-user breakage scenarios, missing features, export quality


## WILL BREAK (fix now)

### 1. Shared team page shows NO personality slider values

`/team/[id]/page.tsx` renders agent name, role badge, and traits — but completely omits the personality slider visualization. The agent card on `/build` has those nice mini-bars, but the shared view just shows a flat card. Someone receiving a shared link has no idea what personality configuration each agent has. The slider values are IN the `team_data` JSON (Supabase stores the full Team object), they're just not rendered.

**Impact:** The share feature, which is a primary social/viral mechanism, ships incomplete information. Someone viewing a shared team sees ~30% of what the creator configured.

### 2. Fork redirects to `/team/:id` — NOT to `/build` with the team loaded

`handleFork()` in `/team/[id]/page.tsx` does `window.location.href = data.url` where `data.url` is `/team/${fork.short_id}` — another read-only team page. The user clicks "Fork this team" and lands on... another read-only view of the same team with "(fork)" appended to the name. They can never actually EDIT the forked team because there's no mechanism to load a Supabase team into the `/build` page's localStorage-based state.

**Impact:** Forking is completely broken as a user feature. It creates a DB row but provides zero editing capability.

### 3. `MAX_POINTS_PER_AGENT` (15) is enforced in the AI prompt but NOT in the UI

The personality editor has 5 sliders, each -5 to +5. A user can set all 5 to extremes (total absolute value = 25), exceeding the 15-point budget. The `maxPoints` field exists in `PersonalityConfig` but nothing reads it. There is no validation, no visual budget indicator, no warning. The constraint only exists in the AI team builder prompt.

**Impact:** Users will create over-budget personalities that produce incoherent prompt fragments ("very bold, very playful, very experimental, very verbose, very warm" — the agent has no actual personality, just ALL the extremes). The generated skill files will read like parody.

### 4. Preset teams have ALL-NEUTRAL personalities

`createTeamFromPreset()` calls `createDefaultAgent(role, meta)`, which uses `meta.defaultPersonality`. The role definitions DO have non-zero defaults (e.g., copywriter has `personality(-3, -2, 0, 0, -2)`). So preset agents get the role's default personality. HOWEVER, they get ZERO traits and an empty customPrompt. A "Landing Page Sprint" preset with 4 agents that have no traits and no custom instructions feels half-configured. Users expect presets to be opinionated and ready-to-use.

**Impact:** Preset teams feel underwhelming. User picks "Brand Campaign" and sees 4 agents with some slider values but no traits, no custom instructions. It's technically not broken but it feels unfinished.

### 5. `postMessage` to parent uses `'*'` origin — security hole

`iframe-bridge.ts` line 12: `window.parent.postMessage({ type: 'designteam:team-selected', team }, '*')`. This sends the full team JSON (including any custom prompts the user typed) to ANY parent origin. If someone embeds the `/build` page in a malicious iframe, they receive all team data.

**Impact:** Data leak vector. Any site can embed `/build` in an iframe and silently receive team configurations including custom prompts (which might contain sensitive project info).

### 6. No error handling if localStorage is full

`build/page.tsx` line 63: `localStorage.setItem("designteam-current", JSON.stringify(team))` — no try/catch. If localStorage is full (5MB limit, common on mobile or when other apps use it), this throws and the useEffect crashes. React won't re-render on subsequent state changes because the effect errored.

**Impact:** Silent data loss on storage-constrained devices. User configures a team, thinks it's saved, closes tab, comes back to default empty team.


## FRAGILE (fix soon)

### 7. Recruitment view prevents duplicate roles but AI builder and presets don't

`RecruitmentView` disables the "Recruit" button for roles already in the team (`disabled={inTeam}`). But `handleSelectPreset` replaces the entire team with `setTeam(presetTeam)`, and `handleTeamGenerated` from the AI builder also replaces the entire team. Neither validates for duplicate roles. The AI builder's parse function doesn't deduplicate either — if the AI returns two "copywriter" agents, both are kept.

**Impact:** Teams can end up with duplicate roles via AI build or presets. Not catastrophic, but inconsistent with the recruitment view's constraint. Could confuse the skill generation pipeline if it expects one agent per role.

### 8. `skillFile` is always empty string — never populated

`createDefaultAgent()` sets `skillFile: ''`. The `generateSkillFile()` function EXISTS in `skill-generator.ts` but is never called from any UI component or export flow. The field is always `''` in localStorage, in Supabase, and in exports.

**Impact:** The skill generation pipeline is implemented but disconnected. The JSON export includes `"skillFile": ""` for every agent, which is misleading. Anyone expecting the exported JSON to contain generated skills gets nothing.

### 9. Copy button `copied` state is shared between markdown and JSON tabs

`TeamExport` uses a single `copied` state for both tabs. If you copy the markdown, switch to JSON tab, the "Copied" label resets (good, via `onValueChange`). But if you copy markdown, then immediately copy JSON without switching tabs... the state is shared. Minor but confusing — user clicks "Copy" on JSON, sees "Copied", but it might have been the markdown copy that just resolved.

**Impact:** Minor UX confusion. Low severity.

### 10. Two-tab localStorage conflict

If a user opens `/build` in two tabs, both load the same team from localStorage. Editing in Tab A saves to localStorage. Tab B still has the old state in React. When Tab B makes any change, it overwrites Tab A's changes. There's no `storage` event listener, no locking, no conflict detection.

**Impact:** Silent data loss for users who work in multiple tabs (common behavior).

### 11. Shared team view uses `<img>` instead of Next.js `<Image>`

`/team/[id]/page.tsx` line 113 uses raw `<img>` tag while every other component uses Next.js `<Image>`. This bypasses image optimization and might cause layout shift (no explicit width/height).

**Impact:** Performance and CLS on shared team pages. Minor but sloppy.

### 12. No Supabase fallback — app is fully broken if Supabase is down

The `/build` page works offline (localStorage). But Share and Fork depend entirely on Supabase with no graceful degradation beyond a generic "Network error" message. The landing page and team view pages make no API calls so they're fine. But the share flow has no retry, no offline queue, no local fallback.

**Impact:** Share and Fork features are 100% unavailable during Supabase outages. The "Generate share link" button just shows an error.

### 13. `describeAxis` has an asymmetric range gap

In `personality-engine.ts`, the mapping is:
- `-5 to -3` = "very [left]"
- `-2 to -1` = "somewhat [left]"
- `0` = "balanced"
- `1 to 2` = "somewhat [right]"
- `3 to 5` = "very [right]"

Value `-2` maps to "somewhat [left]" (medium intensity). But the negative "medium" range covers 2 values (-2, -1) while the positive "medium" range also covers 2 values (1, 2). The "high" ranges are asymmetric: negative covers 3 values (-5, -4, -3) while positive covers 3 values (3, 4, 5). This is actually symmetric. BUT: value `-2` is "somewhat" while value `2` is also "somewhat" — that's consistent. The real issue is that value `0` is the only "balanced" — there's no dead zone. Moving from 0 to 1 or 0 to -1 immediately triggers a personality descriptor. This makes the sliders feel twitchy. A dead zone of -1 to +1 as "balanced" would feel more natural.

**Impact:** Users moving a slider by 1 tick get a personality descriptor that might feel too strong. "Somewhat bold" for a 1/5 setting seems overstated.


## MISSING (nice to have)

### 14. No drag-and-drop reordering of agents

The party lineup renders agents in insertion order. Users cannot reorder them. For a team builder focused on creative roles, the inability to arrange agents (e.g., put the Creative Director first) feels like a gap.

### 15. No agent duplication

Users can't duplicate an agent to create a variant (same role, tweaked personality). They'd have to recruit the same role again... but the recruitment view prevents duplicate roles. Dead end.

### 16. No undo/redo

No history tracking. Accidentally removing an agent with the "Remove from Team" button is irreversible. No confirmation dialog either — one click and the agent is gone.

### 17. No "save" confirmation or autosave indicator

The app autosaves to localStorage on every change, but there's zero visual feedback. No "Saved" toast, no timestamp, no dirty indicator. Users have no idea if their work is persisted.

### 18. No personality preview / "test this personality"

Users configure sliders and traits but never see what the AI will actually SOUND like. There's no preview of the generated prompt fragment. The `personalityToPromptFragment` output is only visible in the markdown export. A live preview in the personality editor would be transformative for the UX.

### 19. No JSON import

Export to JSON exists but there's no import. Users can't re-import a previously exported team. The JSON export includes the full `Team` object so it's technically reimportable, but there's no UI for it.

### 20. No mobile responsiveness on /build

The `/build` page uses `flex h-dvh` with a fixed `w-56` sidebar. On mobile (<640px), the sidebar takes ~60% of the screen and the content area is cramped. There's no collapsible sidebar, no hamburger menu, no responsive breakpoint. The personality editor sheet (`SheetContent side="right"`) will work on mobile (full width), but getting to it through the cramped card grid will be painful.

### 21. No keyboard navigation

No keyboard shortcuts for common actions (Cmd+Z for undo, Delete to remove agent, Tab navigation through agents). The agent cards are `<button>` elements so they're focusable, but there's no visual focus indicator beyond the default browser outline.

### 22. No loading states for API calls

The Share view shows "Sharing..." on the button, which is good. But there's no skeleton/spinner for the team page load, just "Loading team..." text. No loading indicator when navigating between views.

### 23. Agent role cannot be changed after creation

Once an agent is recruited as a "Copywriter", there's no way to change their role to "UX Writer" without removing and re-recruiting. The personality editor shows the role description but doesn't allow changing it.

### 24. No team description field

Teams have a name but no description. When sharing a team, there's no way to explain what project it's for, what the team's focus is, etc. The shared view shows just the name and agent count.


## WORKING WELL (keep)

### 25. Personality engine produces coherent prompts

Testing the mental test case: `{ bold-subtle: -4, playful-serious: -3, experimental-conventional: 0, verbose-concise: 3, warm-corporate: -2 }`, traits: ["creative", "fast-paced"], customPrompt: "Focus on conversion. Use data to back up claims."

The engine produces:
```
You communicate with a very bold tone, a very playful manner, somewhat concise responses and a somewhat warm style.
Key traits: creative, fast-paced.
Additional instructions: Focus on conversion. Use data to back up claims.
```

This is clear, actionable, and would genuinely steer an AI's behavior. The skip-neutral-axes logic (experimental-conventional at 0 is omitted) is smart. The template system is clean and extensible.

### 26. AI team builder prompt is well-structured

The `generateTeamBuildPrompt` function produces a comprehensive, well-formatted prompt with all available roles, personality axes, trait options, and a clear JSON output format. The parser handles markdown fences, validates roles, clamps slider values, and filters invalid traits. Robust against common LLM output quirks.

### 27. Data model is clean and portable

The `Team` and `Agent` types are well-designed: no framework dependencies, no circular references, fully JSON-serializable. The separation of `PersonalityConfig` (sliders) from `traits` (pills) from `customPrompt` (freeform) gives good flexibility. The `AgentRoleMeta` with `defaultPersonality` and `baseSkillKeys` is a solid pattern.

### 28. Agent card mini-bars are excellent UX

The tiny personality visualization bars on each agent card (showing deviation from center) give an at-a-glance personality fingerprint. The color-coding by role makes teams visually scannable. The trait pill overflow (`+3`) is handled gracefully.

### 29. Markdown export is genuinely useful

The `teamToMarkdown` output is structured, human-readable, and includes actionable instructions for using it in Claude Code. The personality fragment is inlined per agent. Custom instructions are highlighted. A user could paste this into a CLAUDE.md and get meaningful behavioral steering.

### 30. localStorage persistence is fast and reliable (when it works)

The save-on-every-change pattern with `useEffect` is the right call for this kind of tool. No explicit save button needed. The load function has corruption handling (try/catch, type validation). The data format is stable.

### 31. Supabase API routes are clean

The team CRUD API is well-structured: proper error handling, user auth checks on mutations, short_id + uuid dual-lookup, RLS-compatible patterns. The fork endpoint correctly copies `team_data` and increments fork count.

### 32. Preset system is well-designed

The preset data structure (roles array + factory function) is clean and extensible. Adding new presets is a one-line addition. The UI previews show avatar thumbnails for each role in the preset, giving visual context.


## Priority Ranking

| # | Issue | Severity | Effort |
|---|-------|----------|--------|
| 2 | Fork goes to read-only page | Critical | Medium |
| 1 | Shared page missing personality | High | Low |
| 6 | localStorage no try/catch | High | Trivial |
| 5 | postMessage `'*'` origin | High | Trivial |
| 3 | No point budget enforcement in UI | High | Medium |
| 8 | skillFile never populated | Medium | Medium |
| 10 | Two-tab localStorage conflict | Medium | Medium |
| 4 | Presets have no traits/customPrompt | Medium | Low |
| 16 | No undo + no confirmation on delete | Medium | Medium |
| 18 | No personality preview | Medium | Low |
| 20 | Mobile layout broken | Medium | Medium |
| 13 | Slider dead zone too narrow | Low | Trivial |
| 19 | No JSON import | Low | Low |
| 14 | No drag-and-drop reorder | Low | Medium |

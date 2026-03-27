# Design Team Agents

This app helps users assemble a team of AI design agents. Each agent has a role, personality sliders, traits, and custom instructions that get exported as skill files.

## Built-in Agent Definitions

See `.claude/agents/` for the Claude Code agent configurations:

- **Design Lead** (`.claude/agents/design-lead.md`) — Creative director who runs the design process
- **Design Reviewer** (`.claude/agents/design-reviewer.md`) — Reviews designs for quality and consistency
- **Copywriter** (`.claude/agents/copywriter.md`) — Writes marketing and UI copy
- **Accessibility Checker** (`.claude/agents/accessibility-checker.md`) — Audits designs for accessibility

## Exported Skills

The `skills/` directory contains installable skill files for external AI tools:

- `brand-strategy` — Brand identity systems
- `copywriting` — Marketing and conversion copy
- `design-team` — Full design workflow orchestration
- `graphic-design` — Visual design and composition
- `social-media` — Platform-optimized social content
- `ux-writing` — UI microcopy and interface text
- `web-design` — Web page layout and design

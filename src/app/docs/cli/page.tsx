import { CopyBlock } from "@/components/copy-block"

const SKILLS = [
  { name: "researcher", description: "Competitive analysis, audience profiling, positioning gaps" },
  { name: "copywriter", description: "Headlines, body copy, CTAs, voice, messaging hierarchy" },
  { name: "graphic-designer", description: "Color, typography, composition, imagery, visual systems" },
  { name: "ux-designer", description: "User flows, IA, interaction patterns, wireframes" },
  { name: "ux-writer", description: "Button labels, error messages, empty states, tooltips, microcopy" },
  { name: "editorial-designer", description: "Grid systems, spacing, reading rhythm, responsive layouts" },
  { name: "social-media-designer", description: "Platform-specific content, carousels, stories, thumbnails" },
  { name: "creative-director", description: "Orchestration, brief-setting, quality gates" },
  { name: "design-engineer", description: "Components, responsive code, tokens, CSS/React" },
  { name: "brand-strategist", description: "Brand identity, visual systems, voice/tone, guidelines" },
  { name: "marketing-strategist", description: "Campaign planning, channel strategy, audience targeting" },
  { name: "print-designer", description: "Business cards, flyers, packaging, large-format print" },
  { name: "motion-designer", description: "Animation, transitions, micro-interactions" },
  { name: "accessibility-specialist", description: "WCAG audits, assistive tech, universal design" },
  { name: "content-strategist", description: "Content architecture, editorial calendars, taxonomy" },
  { name: "seo-specialist", description: "On-page SEO, meta tags, structured data, keyword strategy" },
  { name: "design-team", description: "Full orchestrator: classifies projects, activates specialists in sequence" },
]

export default function CliPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">CLI Integration</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Use your Design Team agents directly in Claude Code, Cursor, or Codex.
        </p>
      </div>

      {/* Installation */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Installation</h2>
        <p className="text-muted-foreground">
          Install all 17 skills with a single command:
        </p>
        <CopyBlock code="npx skills add pablostanley/designteam-app" />
        <p className="text-sm text-muted-foreground">
          This downloads the skill files and registers them with your AI tool.
          No build step required.
        </p>
      </section>

      {/* Available Skills */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Available Skills (17)</h2>
        <p className="text-muted-foreground">
          Each skill is a standalone Markdown file with domain expertise and
          personality injection. Install all at once or reference individual
          skills by name.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 pr-4 font-medium">Skill</th>
                <th className="pb-2 font-medium">What it does</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              {SKILLS.map((skill) => (
                <tr key={skill.name} className="border-b">
                  <td className="py-2 pr-4 font-mono text-xs text-foreground">
                    {skill.name}
                  </td>
                  <td className="py-2">{skill.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Claude Code */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Claude Code</h2>
        <p className="text-muted-foreground">
          After installing, Claude Code automatically picks up the skills. You
          can reference agents by name in your prompts:
        </p>
        <CopyBlock code={`# In your Claude Code session\n> /graphic-designer Create a hero section for our landing page\n\n# Or reference the full team\n> /creative-director Review the homepage design and suggest improvements`} />
        <p className="text-sm text-muted-foreground">
          Each agent&apos;s personality and expertise is baked into the skill
          file, so the AI responds with the right tone and knowledge
          automatically.
        </p>
      </section>

      {/* Cursor */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Cursor</h2>
        <p className="text-muted-foreground">
          Cursor loads skill files from your project directory. After
          installation, open Cursor and the skills appear in your agent list:
        </p>
        <CopyBlock code={`# The skill files are saved to your project\n.skills/\n  graphic-designer/SKILL.md\n  ux-designer/SKILL.md\n  copywriter/SKILL.md\n  ...\n\n# Reference them in Cursor's AI chat\n@graphic-designer Design a card component with hover states`} />
      </section>

      {/* Codex */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Codex</h2>
        <p className="text-muted-foreground">
          For OpenAI Codex, paste the exported Markdown from your agent&apos;s
          skill file into the system prompt. The personality and role
          instructions carry over to any model that accepts system prompts.
        </p>
        <CopyBlock code={`# Export your team as Markdown from the UI\n# Then paste the agent's section into your Codex system prompt\n\n# Example system prompt:\nYou are Pixel, a Graphic Designer agent.\nYou communicate with a very bold tone, a very playful manner,\nand very experimental approaches.\nKey traits: creative, risk-taking.`} />
      </section>

      {/* How skill files work */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">How Skill Files Work</h2>
        <p className="text-muted-foreground">
          Each skill file is a Markdown document that combines:
        </p>
        <ol className="list-decimal space-y-2 pl-6 text-muted-foreground">
          <li>
            <span className="font-medium text-foreground">
              Base role knowledge
            </span>{" "}
            — domain expertise for the role (e.g., UX principles, typography
            rules, research methodologies)
          </li>
          <li>
            <span className="font-medium text-foreground">
              Personality injection
            </span>{" "}
            — generated from your slider settings, traits, and custom prompt
          </li>
        </ol>
        <p className="text-muted-foreground">
          The skill generator merges these at export time. If the base skill
          contains a <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono text-foreground">{"{{PERSONALITY}}"}</code>{" "}
          placeholder, the personality fragment replaces it inline. Otherwise,
          it&apos;s appended as a separate section.
        </p>
      </section>
    </div>
  )
}

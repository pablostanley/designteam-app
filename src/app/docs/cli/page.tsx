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
          Install the Design Team skills with a single command:
        </p>
        <pre className="overflow-x-auto rounded-lg border bg-muted px-4 py-3 text-sm">
          <code>npx skills add pablostanley/designteam-app</code>
        </pre>
        <p className="text-sm text-muted-foreground">
          This downloads the skill files and registers them with your AI tool.
          No build step required.
        </p>
      </section>

      {/* Claude Code */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Claude Code</h2>
        <p className="text-muted-foreground">
          After installing, Claude Code automatically picks up the skills. You
          can reference agents by name in your prompts:
        </p>
        <pre className="overflow-x-auto rounded-lg border bg-muted px-4 py-3 text-sm">
          <code>{`# In your Claude Code session
> /graphic-designer Create a hero section for our landing page

# Or reference the full team
> /creative-director Review the homepage design and suggest improvements`}</code>
        </pre>
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
        <pre className="overflow-x-auto rounded-lg border bg-muted px-4 py-3 text-sm">
          <code>{`# The skill files are saved to your project
.skills/
  graphic-designer/SKILL.md
  ux-designer/SKILL.md
  copywriter/SKILL.md
  ...

# Reference them in Cursor's AI chat
@graphic-designer Design a card component with hover states`}</code>
        </pre>
      </section>

      {/* Codex */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Codex</h2>
        <p className="text-muted-foreground">
          For OpenAI Codex, paste the exported Markdown from your agent&apos;s
          skill file into the system prompt. The personality and role
          instructions carry over to any model that accepts system prompts.
        </p>
        <pre className="overflow-x-auto rounded-lg border bg-muted px-4 py-3 text-sm">
          <code>{`# Export your team as Markdown from the UI
# Then paste the agent's section into your Codex system prompt

# Example system prompt:
You are Pixel, a Graphic Designer agent.
You communicate with a very bold tone, a very playful manner,
and very experimental approaches.
Key traits: creative, risk-taking.`}</code>
        </pre>
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

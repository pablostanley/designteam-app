export default function ExportPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Export Formats</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Design Team exports your configuration in Markdown and JSON so you can
          use it with any AI tool.
        </p>
      </div>

      {/* Markdown */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Markdown Format</h2>
        <p className="text-muted-foreground">
          The Markdown export produces a single document with every agent&apos;s
          personality, traits, and custom instructions. It&apos;s designed to be
          pasted directly into system prompts or saved as skill files.
        </p>
        <div className="rounded-lg border bg-muted">
          <div className="border-b px-4 py-2 text-xs font-medium text-muted-foreground">
            Example Markdown output
          </div>
          <pre className="overflow-x-auto px-4 py-3 text-sm">
            <code>{`# Team: Startup Launch Crew

3 agents configured for collaborative AI design.

## Agents

### Pixel (Graphic Designer)

You communicate with a very bold tone, a very playful manner,
and very experimental approaches.
Key traits: creative, risk-taking.

**Traits:** creative, risk-taking

**Role:** Creates visual compositions, illustrations, and
graphic elements that bring concepts to life.

<details>
<summary>Skill File for Pixel</summary>

# Graphic Designer

You are Pixel, a graphic designer agent.

## Personality
You communicate with a very bold tone, a very playful manner,
and very experimental approaches.

## Core Skills
- Color theory and palette creation
- Typography and type pairing
- Composition and visual hierarchy
- Imagery selection and art direction

## Instructions
Focus on startup-friendly visuals. Bold colors, clean type.

</details>

---

### Aria (Copywriter)

You communicate with a very bold tone, a very playful manner,
and a very warm style.

**Custom Instructions:** Focus on startup-friendly language.
Keep it punchy and conversational.

**Role:** Crafts compelling headlines, body copy, and messaging
that connects with the target audience.

<details>
<summary>Skill File for Aria</summary>

# Copywriter

You are Aria, a copywriter agent.

## Personality
You communicate with a very bold tone, a very playful manner,
and a very warm style.

## Core Skills
- Headlines using PAS/AIDA frameworks
- Benefit-driven CTAs
- Voice and tone calibration
- Messaging hierarchy

## Custom Instructions
Focus on startup-friendly language.
Keep it punchy and conversational.

</details>

---

## How to Use

Copy each agent's personality description into your AI tool's
system prompt.
For Claude Code, add these as custom instructions or skill files.`}</code>
          </pre>
        </div>
      </section>

      {/* JSON */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">JSON Format</h2>
        <p className="text-muted-foreground">
          The JSON export contains the full team structure including IDs,
          personality slider values, traits, and custom prompts. Use it for
          programmatic integrations or to back up and restore teams.
        </p>
        <div className="rounded-lg border bg-muted">
          <div className="border-b px-4 py-2 text-xs font-medium text-muted-foreground">
            Example JSON output
          </div>
          <pre className="overflow-x-auto px-4 py-3 text-sm">
            <code>{`{
  "id": "team-1711234567890-abc123",
  "name": "Startup Launch Crew",
  "agents": [
    {
      "id": "agent-1711234567890-def456",
      "name": "Pixel",
      "role": "graphic-designer",
      "personality": {
        "sliders": {
          "bold-subtle": -4,
          "playful-serious": -3,
          "experimental-conventional": -3,
          "verbose-concise": 0,
          "warm-corporate": -1
        }
      },
      "traits": ["creative", "risk-taking"],
      "customPrompt": "",
      "skillFile": "..."
    }
  ],
  "createdAt": "2026-03-23T10:00:00.000Z",
  "updatedAt": "2026-03-23T10:30:00.000Z"
}`}</code>
          </pre>
        </div>
      </section>

      {/* Using exports */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Using Exported Configs</h2>
        <p className="text-muted-foreground">
          Both formats work with any AI tool that accepts text instructions:
        </p>
        <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
          <li>
            <span className="font-medium text-foreground">
              Claude Code / Cursor
            </span>{" "}
            — Save each agent&apos;s Markdown as a{" "}
            <code className="rounded bg-background px-1 py-0.5 text-xs font-mono text-foreground">
              SKILL.md
            </code>{" "}
            file in your project
          </li>
          <li>
            <span className="font-medium text-foreground">ChatGPT / Codex</span>{" "}
            — Paste the Markdown into the system prompt or custom instructions
          </li>
          <li>
            <span className="font-medium text-foreground">
              Programmatic use
            </span>{" "}
            — Parse the JSON to dynamically load agent configs into your
            application
          </li>
          <li>
            <span className="font-medium text-foreground">Backup</span> — Use
            JSON to save and restore full team configurations, including all
            slider values and metadata
          </li>
        </ul>
      </section>

      {/* Personality mapping */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">
          How Personality Becomes a Prompt
        </h2>
        <p className="text-muted-foreground">
          When you export, the personality engine converts slider values into
          natural language:
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 pr-4 font-medium">Slider Value</th>
                <th className="pb-2 font-medium">Generated Text</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              <tr className="border-b">
                <td className="py-2 pr-4 font-mono text-foreground">-5 to -3</td>
                <td className="py-2">&quot;very [left label]&quot;</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-4 font-mono text-foreground">-2 to -1</td>
                <td className="py-2">&quot;somewhat [left label]&quot;</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-4 font-mono text-foreground">0</td>
                <td className="py-2">Skipped (neutral)</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-4 font-mono text-foreground">+1 to +2</td>
                <td className="py-2">&quot;somewhat [right label]&quot;</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-mono text-foreground">+3 to +5</td>
                <td className="py-2">&quot;very [right label]&quot;</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-sm text-muted-foreground">
          For example, a bold-subtle slider at -4 produces &quot;a very bold
          tone&quot; in the personality fragment.
        </p>
      </section>
    </div>
  )
}

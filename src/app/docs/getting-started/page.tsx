export default function GettingStartedPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Getting Started</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Build a team of specialized AI design agents in minutes.
        </p>
      </div>

      {/* What is Design Team */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">What is Design Team?</h2>
        <p className="text-muted-foreground">
          Design Team lets you assemble a crew of AI agents, each with a
          distinct role and personality. You configure how each agent thinks and
          communicates, then export the result as skill files that plug into
          Claude Code, Cursor, Codex, or any AI tool that accepts system
          prompts.
        </p>
      </section>

      {/* Step by step */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Building a Team</h2>
        <ol className="list-decimal space-y-4 pl-6 text-muted-foreground">
          <li>
            <span className="font-medium text-foreground">
              Create a new team
            </span>{" "}
            — Click &quot;Build Your Team&quot; on the homepage. Give your team a
            name or use the default.
          </li>
          <li>
            <span className="font-medium text-foreground">Add agents</span> —
            Pick from eight roles: Researcher, Copywriter, Graphic Designer, UX
            Designer, UX Writer, Editorial Designer, Social Media Designer, and
            Creative Director. Each role comes with a baseline skill set.
          </li>
          <li>
            <span className="font-medium text-foreground">
              Tune personality
            </span>{" "}
            — Adjust each agent&apos;s five personality sliders (see below) to
            shape how they communicate.
          </li>
          <li>
            <span className="font-medium text-foreground">Add traits</span> —
            Select trait pills like &quot;creative&quot;, &quot;analytical&quot;,
            or &quot;minimalist&quot; to further refine the agent&apos;s
            behavior.
          </li>
          <li>
            <span className="font-medium text-foreground">
              Write custom instructions
            </span>{" "}
            — Optionally add free-form text to give the agent specific guidance
            for your project.
          </li>
          <li>
            <span className="font-medium text-foreground">Export</span> — Download
            your team as Markdown or JSON. Each agent&apos;s skill file combines
            the base role knowledge with your personality configuration.
          </li>
        </ol>
      </section>

      {/* Personality sliders */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Personality Sliders</h2>
        <p className="text-muted-foreground">
          Each slider is bipolar, ranging from -5 to +5. A value of 0 means the
          agent is neutral on that axis. The further from zero, the stronger the
          trait.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 pr-4 font-medium">Axis</th>
                <th className="pb-2 pr-4 font-medium">-5 (Left)</th>
                <th className="pb-2 font-medium">+5 (Right)</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              <tr className="border-b">
                <td className="py-2 pr-4 font-medium text-foreground">
                  bold-subtle
                </td>
                <td className="py-2 pr-4">Bold</td>
                <td className="py-2">Subtle</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-4 font-medium text-foreground">
                  playful-serious
                </td>
                <td className="py-2 pr-4">Playful</td>
                <td className="py-2">Serious</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-4 font-medium text-foreground">
                  experimental-conventional
                </td>
                <td className="py-2 pr-4">Experimental</td>
                <td className="py-2">Conventional</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-4 font-medium text-foreground">
                  verbose-concise
                </td>
                <td className="py-2 pr-4">Verbose</td>
                <td className="py-2">Concise</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-medium text-foreground">
                  warm-corporate
                </td>
                <td className="py-2 pr-4">Warm</td>
                <td className="py-2">Corporate</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Traits */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Traits</h2>
        <p className="text-muted-foreground">
          Traits are single-word descriptors you can toggle on for each agent.
          They appear in the generated skill file as &quot;Key traits&quot; and
          help the AI model understand the agent&apos;s working style at a
          glance.
        </p>
        <p className="text-muted-foreground">Available traits:</p>
        <div className="flex flex-wrap gap-2">
          {[
            "creative",
            "analytical",
            "detail-oriented",
            "big-picture",
            "fast-paced",
            "methodical",
            "minimalist",
            "maximalist",
            "data-driven",
            "intuitive",
            "collaborative",
            "independent",
            "risk-taking",
            "cautious",
            "empathetic",
            "direct",
          ].map((trait) => (
            <span
              key={trait}
              className="rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground"
            >
              {trait}
            </span>
          ))}
        </div>
      </section>

      {/* Custom prompts */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Custom Prompts</h2>
        <p className="text-muted-foreground">
          The custom prompt field accepts free-form text appended to the
          agent&apos;s skill file as &quot;Additional instructions.&quot; Use it
          to provide project-specific context, brand guidelines, or any other
          direction you want the agent to follow.
        </p>
      </section>
    </div>
  )
}

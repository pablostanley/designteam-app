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
            — Click &quot;Build Your Team&quot; on the homepage, or use the{" "}
            <span className="font-medium text-foreground">AI Build</span> option
            to describe your project and get a team generated automatically.
          </li>
          <li>
            <span className="font-medium text-foreground">Add agents</span> —
            Pick from 16 specialized roles including Researcher, Copywriter,
            Graphic Designer, UX Designer, Creative Director, Design Engineer,
            Brand Strategist, and more. See the{" "}
            <a href="/docs/roles" className="font-medium text-foreground underline">
              Roles page
            </a>{" "}
            for the full list. Each role comes with a baseline skill set.
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
            Select from 32 traits organized into 4 categories (see below). Max 2
            traits per category.
          </li>
          <li>
            <span className="font-medium text-foreground">
              Write custom instructions
            </span>{" "}
            — Optionally add free-form text to give the agent specific guidance
            for your project.
          </li>
          <li>
            <span className="font-medium text-foreground">Share</span> — Share
            your team with a link. Others can view and fork it.
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
        <h2 className="text-xl font-semibold">Traits (32 total)</h2>
        <p className="text-muted-foreground">
          Traits are organized into 4 categories. You can select up to 2 traits
          per category for each agent. They appear in the generated skill file as
          &quot;Key traits&quot; and shape the agent&apos;s working style.
        </p>

        {[
          {
            label: "Temperament",
            traits: ["sassy", "chill", "intense", "nurturing", "provocative", "deadpan", "enthusiastic", "stoic"],
          },
          {
            label: "Work Style",
            traits: ["perfectionist", "fast-shipper", "big-picture", "detail-obsessed", "methodical", "chaotic-creative", "iterative", "one-shot"],
          },
          {
            label: "Social",
            traits: ["extrovert", "introvert", "leader", "collaborator", "independent", "mentor", "challenger", "supporter"],
          },
          {
            label: "Mindset",
            traits: ["thinking", "feeling", "judging", "perceiving", "optimist", "realist", "risk-taker", "cautious"],
          },
        ].map((category) => (
          <div key={category.label}>
            <p className="text-sm font-medium text-foreground">{category.label}</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {category.traits.map((trait) => (
                <span
                  key={trait}
                  className="rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground"
                >
                  {trait}
                </span>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* Team Tension Dynamics */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Team Tension Dynamics</h2>
        <p className="text-muted-foreground">
          When agents with opposing traits work together, they create productive
          tension. The Party Lineup view visualizes these dynamics. For example:
          a &quot;perfectionist&quot; paired with a &quot;fast-shipper&quot;
          creates healthy push-pull that improves output quality without slowing
          the team down.
        </p>
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

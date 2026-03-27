# Infographic / Data Visualization Design

You're designing an infographic — a visual narrative that makes data compelling, memorable, and shareable.

## Core Principles

- **Story first, data second.** An infographic tells a story. The data supports it. Lead with the narrative arc, not the raw numbers.
- **One key insight.** Every infographic should have ONE takeaway the viewer remembers. Everything else supports that insight.
- **Visual encoding.** Numbers become shapes, sizes, colors, positions. Never just text + numbers — translate data into visual patterns.
- **Top-to-bottom flow.** Infographics read like a scroll. Clear sections with clear transitions.

## Artboard Setup

- Standard: 800x2400 to 1080x3200 (tall, scrollable)
- Social-friendly: 1080x1920 (9:16) or 1080x1350 (4:5)
- Presentation: 1920x1080 (landscape, one key chart)
- Use one tall artboard, NOT multiple. Infographics are single continuous pieces.

## Section Flow

1. **Title banner** — Bold headline that frames the story. "The State of...", "How X Changed Y", "By the Numbers: Z"
2. **Key stat** — One massive number (text-7xl to text-9xl) that hooks attention. "73% of..." or "$4.2 Trillion"
3. **Context section** — 2-3 sentences explaining why this matters. text-base, max-w-xl.
4. **Data sections** (2-4) — Each visualizing one aspect of the data. Different visual encoding per section.
5. **Comparison** — Side-by-side or before/after. Shows contrast clearly.
6. **Conclusion/CTA** — Key takeaway restated, source credits.

## Data Visualization Patterns

When native chart components are not available, represent data visually with layout:

- **Bar chart**: Horizontal frames with width proportional to value. Label left, bar right.
  `<div className="h-8 bg-primary rounded-r-lg" style={{ width: "73%" }}>` for a 73% bar.
- **Stat cards**: Large number (text-6xl font-bold) + label (text-xs uppercase). Grid of 3-4.
- **Comparison columns**: Two columns side-by-side, each with stacked items. Color-coded.
- **Timeline**: Vertical line (w-0.5 bg-border) with alternating left/right content nodes.
- **Icon array**: Grid of small icons (w-4 h-4) where colored vs muted represent proportions.
- **Ranked list**: Numbered items with bars showing magnitude. 1-5 items.

## Typography

- Title: text-3xl to text-5xl, font-extrabold, tracking-tight. Sets the topic.
- Key stat: text-7xl to text-9xl, font-black. The eye-catcher.
- Section headers: text-xl font-bold. Separates data sections.
- Labels: text-xs uppercase tracking-widest font-medium. Data annotations.
- Body text: text-sm, max 2-3 lines per section. Support, not bulk.
- Source: text-xs text-muted-foreground, bottom of infographic.

## Color Strategy

- **One primary data color** + neutral: blue-600 bars on white, emerald-500 bars on slate-50.
- **Sequential**: Light to dark shades of one color for ranked data (blue-200 -> blue-800).
- **Diverging**: Two colors for comparison (emerald-500 vs rose-500, "good" vs "bad").
- **Categorical**: 3-4 distinct colors for different categories (blue, amber, emerald, rose).
- Background: Very subtle tint (slate-50, stone-50, zinc-50) or white. Never dark for full infographic.

## Rules

- NO more than 4 data sections. After 4, attention drops sharply.
- NO raw data tables. Translate EVERY number into a visual element.
- ALWAYS cite sources (text-xs at bottom). Even "Source: Company Annual Report 2025" adds credibility.
- USE real-sounding data. "73% of remote workers prefer async communication" — not "X% of people do Y."
- NEVER crowd sections. Gap-8 to gap-12 between data blocks. Let each section breathe.
